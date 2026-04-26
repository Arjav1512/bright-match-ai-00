import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://wroob.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const responseHeaders = {
  ...corsHeaders,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: responseHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);
    const auth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await auth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: responseHeaders });
    }

    const { data: isAdmin } = await service.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: responseHeaders });
    }

    // Fetch profiles, roles, and student/employer phone numbers
    const [{ data: profiles }, { data: roles }, { data: students }, { data: employers }] = await Promise.all([
      service.from("profiles").select("user_id, full_name, created_at").order("created_at", { ascending: false }).limit(500),
      service.from("user_roles").select("user_id, role").limit(1000),
      service.from("student_profiles").select("user_id, phone_number"),
      service.from("employer_profiles").select("user_id, hr_phone, manager_phone, head_office_mobile"),
    ]);

    // Fetch auth users (paginated) to map emails
    const emailMap = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error } = await service.auth.admin.listUsers({ page, perPage });
      if (error || !list?.users?.length) break;
      for (const u of list.users) {
        if (u.email) emailMap.set(u.id, u.email);
      }
      if (list.users.length < perPage) break;
      page++;
      if (page > 10) break; // safety cap (10k users)
    }

    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    const studentPhone = new Map((students || []).map((s: any) => [s.user_id, s.phone_number]));
    const employerPhone = new Map(
      (employers || []).map((e: any) => [e.user_id, e.hr_phone || e.manager_phone || e.head_office_mobile])
    );

    const result = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      created_at: p.created_at,
      role: roleMap.get(p.user_id) || "unknown",
      email: emailMap.get(p.user_id) || null,
      phone: studentPhone.get(p.user_id) || employerPhone.get(p.user_id) || null,
    }));

    return new Response(JSON.stringify({ users: result }), { status: 200, headers: responseHeaders });
  } catch (err) {
    console.error("admin-list-users error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: responseHeaders });
  }
});
