// Hard-deletes internships that have been closed for more than 30 days.
// Triggered by pg_cron once per day. Authenticated by ADMIN_SEED_TOKEN header
// (re-used to avoid introducing a new secret) OR by the Supabase service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const expected = Deno.env.get("ADMIN_SEED_TOKEN");
  const token = req.headers.get("x-cron-token") ?? "";
  const isService = (req.headers.get("authorization") ?? "").includes(
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__none__"
  );

  if (!isService && (!expected || token !== expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data, error } = await supabase.rpc("cleanup_old_closed_internships");
    if (error) throw error;
    return new Response(JSON.stringify({ deleted: data ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-closed-internships error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
