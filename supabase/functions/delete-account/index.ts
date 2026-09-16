import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const BUCKETS = ["avatars", "company-logos", "resumes", "post-images"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** SHA-256 of `${userId}:${code}` — the raw code is never stored. */
async function hashCode(userId: string, code: string) {
  const data = new TextEncoder().encode(`${userId}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

/** Removes every object stored under the user's own folder in each bucket. */
async function purgeStorage(supabase: ReturnType<typeof admin>, userId: string) {
  const failures: string[] = [];
  for (const bucket of BUCKETS) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(userId, { limit: 1000 });
      if (error) {
        failures.push(bucket);
        continue;
      }
      const paths = (data ?? [])
        .filter((f) => f.name)
        .map((f) => `${userId}/${f.name}`);
      if (paths.length > 0) {
        const { error: rmError } = await supabase.storage.from(bucket).remove(paths);
        if (rmError) failures.push(bucket);
      }
    } catch {
      failures.push(bucket);
    }
  }
  return failures;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Not authenticated" }, 401);

  const supabase = admin();

  // Identity is ALWAYS derived from the verified JWT — never from the body.
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) return json({ error: "Not authenticated" }, 401);

  const userId = user.id;
  const email = user.email;

  let body: { action?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const action = body?.action;

  if (action === "request") {
    if (!email) {
      return json({ error: "No email address is linked to this account." }, 400);
    }

    // Resend cooldown
    const { data: recent } = await supabase
      .from("account_deletion_otps")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.created_at) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return json(
          {
            error: "cooldown",
            retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
          },
          429,
        );
      }
    }

    // Invalidate any previous outstanding codes for this user.
    await supabase.from("account_deletion_otps").delete().eq("user_id", userId);

    const code = generateCode();
    const codeHash = await hashCode(userId, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    const { error: insertError } = await supabase
      .from("account_deletion_otps")
      .insert({ user_id: userId, code_hash: codeHash, expires_at: expiresAt });

    if (insertError) {
      console.error("otp insert failed", insertError.message);
      return json({ error: "Could not start verification. Please try again." }, 500);
    }

    try {
      const result = await sendTemplateEmail("account-deletion-otp", email, {
        templateData: { code, expiresInMinutes: OTP_TTL_MINUTES },
        idempotencyKey: `account-deletion-${userId}-${Date.now()}`,
        fromLocalPart: "info",
      });
      if (!result.sent) {
        await supabase.from("account_deletion_otps").delete().eq("user_id", userId);
        return json(
          { error: "We couldn't email this address. Please contact support." },
          502,
        );
      }
    } catch (err) {
      console.error("otp email failed", err instanceof Error ? err.message : err);
      await supabase.from("account_deletion_otps").delete().eq("user_id", userId);
      return json({ error: "We couldn't send the verification email." }, 502);
    }

    return json({
      success: true,
      expiresInMinutes: OTP_TTL_MINUTES,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      maskedEmail: email.replace(/^(.).*(@.*)$/, "$1***$2"),
    });
  }

  if (action === "verify") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      return json({ error: "invalid_code" }, 400);
    }

    const { data: record } = await supabase
      .from("account_deletion_otps")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record || record.consumed_at) {
      return json({ error: "no_code" }, 400);
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return json({ error: "expired" }, 400);
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return json({ error: "too_many_attempts" }, 429);
    }

    const submitted = await hashCode(userId, code);
    if (submitted !== record.code_hash) {
      await supabase
        .from("account_deletion_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return json({ error: "invalid_code", attemptsRemaining: Math.max(remaining, 0) }, 400);
    }

    // Single-use: consume atomically. If another concurrent request already
    // consumed it, this update matches no rows and we stop.
    const { data: consumed, error: consumeError } = await supabase
      .from("account_deletion_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", record.id)
      .is("consumed_at", null)
      .select("id");

    if (consumeError || !consumed || consumed.length === 0) {
      return json({ error: "no_code" }, 400);
    }

    // 1) Remove user-owned rows that do not cascade from auth.users.
    const { error: dataError } = await supabase.rpc("delete_user_account_data", {
      _user_id: userId,
    });
    if (dataError) {
      console.error("account data cleanup failed", dataError.message);
      return json({ error: "deletion_failed" }, 500);
    }

    // 2) Storage objects owned exclusively by this user.
    const storageFailures = await purgeStorage(supabase, userId);

    // 3) Finally the auth user — cascades profiles, roles, internships,
    //    applications and notifications via existing foreign keys.
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("auth user deletion failed", authError.message);
      return json({ error: "deletion_failed" }, 500);
    }

    if (storageFailures.length > 0) {
      console.error("storage cleanup incomplete", storageFailures.join(","));
    }

    return json({ success: true, storageCleanupIncomplete: storageFailures.length > 0 });
  }

  return json({ error: "Unknown action" }, 400);
});
