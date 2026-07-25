import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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
        { status: 400, headers: responseHeaders }
      );
    }

    const { email, subject, message } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("Supabase env not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: responseHeaders }
      );
    }

    const idem = crypto.randomUUID();

    // 1) Support notification via Lovable Emails (from: Wroob <info@wroob.in>, to: yourwroob@gmail.com)
    const supportRes = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: "support-notification",
          idempotencyKey: `help-support-${idem}`,
          templateData: { fromEmail: email, subject, message },
        }),
      }
    );

    if (!supportRes.ok) {
      const supportErr = await supportRes.json().catch(() => ({}));
      console.error("Support notification failed:", supportErr);
      return new Response(
        JSON.stringify({ error: "Email delivery failed", details: supportErr }),
        { status: 502, headers: responseHeaders }
      );
    }

    // 2) User acknowledgement (non-blocking on failure)
    try {
      const ackRes = await fetch(
        `${supabaseUrl}/functions/v1/send-transactional-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateName: "help-confirmation",
            recipientEmail: email,
            idempotencyKey: `help-ack-${idem}`,
            templateData: {
              name: email.split("@")[0] || "there",
              subject,
              message,
            },
          }),
        }
      );
      if (!ackRes.ok) {
        const ackErr = await ackRes.json().catch(() => ({}));
        console.error("Transactional ack email failed:", ackErr);
      }
    } catch (ackErr) {
      console.error("User acknowledgement email failed:", ackErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("send-help-message error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: responseHeaders }
    );
  }
});
