import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const applySchema = z.object({
  internship_id: z.string().uuid("internship_id must be a valid UUID"),
  cover_letter: z.string().max(5000).optional().nullable(),
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...responseHeaders },
      });
    }

    // FIX (HIGH-9): Use getUser() — the documented, stable server-side method.
    // getClaims() is a non-standard internal API that may break on SDK updates.
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...responseHeaders },
      });
    }

    // Service role client for privileged DB operations (rate limit, atomic RPC)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // FIX (HIGH-4): Atomic rate limit check — single DB call with FOR UPDATE locking.
    // Replaces the previous read-check-write TOCTOU pattern.
    const { data: allowed, error: rlError } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_user_id: user.id,
        p_function_name: "apply_to_internship",
        p_max_requests: 10,
        p_window_ms: 60 * 60 * 1000,
      }
    );

    if (rlError) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...responseHeaders },
      });
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later.", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...responseHeaders } }
      );
    }

    const rawBody = await req.json();
    const parsed = applySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues.map(i => i.message).join("; ") }),
        { status: 400, headers: { ...responseHeaders } }
      );
    }
    const { internship_id, cover_letter } = parsed.data;

    // FIX (CRITICAL-4): All cap logic is now a single atomic transaction in the DB.
    // SELECT FOR UPDATE serializes concurrent requests; the cap cannot be exceeded.
    const { data: rows, error: rpcError } = await supabaseAdmin.rpc(
      "apply_to_internship_atomic",
      {
        p_student_id: user.id,
        p_internship_id: internship_id,
        p_cover_letter: cover_letter ?? null,
      }
    );

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: rpcError.message || "Internal server error" }),
        { status: 500, headers: { ...responseHeaders } }
      );
    }

    const result = rows?.[0];
    if (!result) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...responseHeaders },
      });
    }

    if (!result.success) {
      const statusCode =
        result.error_code === "NOT_FOUND" ? 404
        : result.error_code === "DUPLICATE" ? 409
        : result.error_code === "CAPACITY_REACHED" ? 409
        : result.error_code === "CLOSED" ? 409
        : 400;

      return new Response(
        JSON.stringify({ error: result.error_message, code: result.error_code }),
        { status: statusCode, headers: { ...responseHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Application submitted! (${result.application_count}/${result.app_cap} slots filled)`,
        application_count: result.application_count,
        app_cap: result.app_cap,
      }),
      { status: 200, headers: { ...responseHeaders } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...responseHeaders },
    });
  }
});
