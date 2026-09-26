import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const PATH_RE = /^covers\/[A-Za-z0-9-]{1,64}\.[A-Za-z0-9]{1,8}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let path: unknown;
  try {
    ({ path } = await req.json());
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  if (typeof path !== "string" || !PATH_RE.test(path)) {
    return json({ error: "invalid_request" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only covers attached to a published post may be served.
  const { data: post, error } = await admin
    .from("blog_posts")
    .select("id")
    .eq("published", true)
    .eq("cover_image", path)
    .limit(1)
    .maybeSingle();
  if (error) return json({ error: "server_error" }, 500);
  if (!post) return json({ error: "not_found" }, 404);

  const { data, error: signErr } = await admin.storage
    .from("blog-images")
    .createSignedUrl(path, 60 * 60 * 24);
  if (signErr || !data?.signedUrl) return json({ error: "server_error" }, 500);

  return json({ url: data.signedUrl });
});
