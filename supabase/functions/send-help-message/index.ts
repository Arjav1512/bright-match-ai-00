import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const helpSchema = z.object({
  email: z.string().email().max(320),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(10000),
});

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

async function logSend(
  supabase: ReturnType<typeof createClient> | null,
  templateName: string,
  recipientEmail: string,
  status: "sent" | "suppressed" | "failed",
  errorMessage?: string,
) {
  if (!supabase) return;
  const { error } = await supabase.from("email_send_log").insert({
    message_id: null,
    template_name: templateName,
    recipient_email: recipientEmail,
    status,
    error_message: errorMessage ?? null,
  });
  if (error) {
    console.error("Failed to write email_send_log", {
      code: error.code,
      message: error.message,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    const body = await req.json();
    const parsed = helpSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parsed.error.issues.map((i) => i.message).join(", "),
        }),
        { status: 400, headers: responseHeaders },
      );
    }

    const { email, subject, message } = parsed.data;
    const supabase = adminClient();
    const idem = crypto.randomUUID();

    // 1) Support notification (template defines the fixed support recipient)
    try {
      const result = await sendTemplateEmail("support-notification", email, {
        templateData: { fromEmail: email, subject, message },
        idempotencyKey: `help-support-${idem}`,
        replyTo: email,
      });

      if (result.sent) {
        await logSend(supabase, "support-notification", email, "sent");
      } else {
        await logSend(supabase, "support-notification", email, "suppressed");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Support notification failed:", errorMsg);
      await logSend(
        supabase,
        "support-notification",
        email,
        "failed",
        errorMsg.slice(0, 1000),
      );
      return new Response(
        JSON.stringify({ error: "Email delivery failed" }),
        { status: 502, headers: responseHeaders },
      );
    }

    // 2) User acknowledgement (non-blocking on failure)
    try {
      const ack = await sendTemplateEmail("help-confirmation", email, {
        templateData: {
          name: email.split("@")[0] || "there",
          subject,
          message,
        },
        idempotencyKey: `help-ack-${idem}`,
      });
      await logSend(
        supabase,
        "help-confirmation",
        email,
        ack.sent ? "sent" : "suppressed",
      );
    } catch (ackErr) {
      const errorMsg = ackErr instanceof Error ? ackErr.message : String(ackErr);
      console.error("User acknowledgement email failed:", errorMsg);
      await logSend(
        supabase,
        "help-confirmation",
        email,
        "failed",
        errorMsg.slice(0, 1000),
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("send-help-message error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: responseHeaders },
    );
  }
});
