import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const feedbackSchema = z.object({
  internship_id: z.string().uuid("internship_id must be a valid UUID"),
  action: z.enum(["applied", "saved", "ignored", "dismissed"], { errorMap: () => ({ message: "action must be one of: applied, saved, ignored, dismissed" }) }),
});

// FIX (HIGH-4): Atomic rate limit via DB function — replaces TOCTOU read-check-write
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_FN_NAME = "recommendation_feedback";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...responseHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...responseHeaders },
      });
    }

    // ── Rate Limit Check (atomic) ─────────────────────────────────────────
    const rateLimitAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rlAllowed, error: rlError } = await rateLimitAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_user_id: user.id,
        p_function_name: RATE_LIMIT_FN_NAME,
        p_max_requests: RATE_LIMIT_MAX,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
      }
    );
    if (rlError) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...responseHeaders },
      });
    }
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter: 3600 }),
        { status: 429, headers: { ...responseHeaders } }
      );
    }

    const rawBody = await req.json();
    const parsed = feedbackSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues.map(i => i.message).join("; ") }),
        { status: 400, headers: { ...responseHeaders } }
      );
    }
    const { internship_id, action } = parsed.data;

    const { error } = await supabase.from("recommendation_feedback").upsert(
      {
        student_id: user.id,
        internship_id,
        action,
      },
      { onConflict: "student_id,internship_id,action" }
    );

    if (error) {
      console.error("Feedback insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...responseHeaders },
      });
    }

    // If dismissed, invalidate cache so next fetch recalculates
    if (action === "dismissed" || action === "ignored") {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await serviceClient
        .from("recommendation_cache")
        .delete()
        .eq("student_id", user.id)
        .eq("internship_id", internship_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...responseHeaders },
    });
  } catch (err) {
    console.error("Feedback error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...responseHeaders },
    });
  }
});
