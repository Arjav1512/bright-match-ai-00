import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// FIX (HIGH-3): `to` is removed from the input schema.
// The recipient is always the authenticated user's own email (from the JWT),
// preventing use as an open relay for phishing or spam.
const emailSchema = z.object({
  subject: z.string().min(1, "subject is required").max(500),
  html: z.string().min(1, "html is required").max(100000),
});

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://wroob.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  "Content-Type": "application/json",
};

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    // FIX (HIGH-9): Use getUser() — the documented, stable method.
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // FIX (HIGH-4): Atomic rate limit — single DB call with FOR UPDATE locking
    const { data: allowed, error: rlError } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_user_id: user.id,
        p_function_name: "send_email",
        p_max_requests: RATE_LIMIT_MAX,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
      }
    );

    if (rlError) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: responseHeaders,
      });
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter: 3600 }),
        { status: 429, headers: responseHeaders }
      );
    }

    const body = await req.json();
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parsed.error.issues.map((i) => i.message).join(", "),
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    const { subject, html } = parsed.data;
    // FIX (HIGH-3): Recipient is always the authenticated user's verified email.
    const to = user.email;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: responseHeaders }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wroob <noreply@wroob.in>",
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify(resendData), {
        status: resendRes.status,
        headers: responseHeaders,
      });
    }

    return new Response(JSON.stringify(resendData), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: responseHeaders }
    );
  }
});
