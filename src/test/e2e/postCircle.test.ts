/**
 * E2E: clicking "Post" on a Wroob Circle should create a peerup_circles row
 * AND, via the create_circle_group trigger, a matching `circle` group with the
 * creator added to group_members.
 *
 * Runs against a fresh local Supabase started by the CI workflow:
 *   supabase start && supabase db reset --no-seed
 *   psql -f supabase/tests/seed.test.sql
 *
 * Required env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_EMAIL = "e2e-student@wroob.test";
const STUDENT_PASSWORD = "TestPass123!";

const SPOT = "__E2E_SPOT__";
const TOPIC = "__E2E_TOPIC__";

const skip = !SUPABASE_URL || !ANON || !SERVICE;
const d = skip ? describe.skip : describe;

let createdCircleId: string | null = null;
let createdGroupId: string | null = null;

d("Post → Circle E2E", () => {
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const client = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  beforeAll(async () => {
    const { error } = await client.auth.signInWithPassword({
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (createdGroupId) {
      await admin.from("group_members").delete().eq("group_id", createdGroupId);
      await admin.from("groups").delete().eq("id", createdGroupId);
    }
    if (createdCircleId) {
      await admin.from("peerup_circles").delete().eq("id", createdCircleId);
    }
    await client.auth.signOut();
  });

  it("creates a peerup_circle and matching group when student posts", async () => {
    const { data: circle, error: insertErr } = await client
      .from("peerup_circles")
      .insert({
        creator_id: STUDENT_ID,
        spot_name: SPOT,
        topic: TOPIC,
        fuel_type: "Coffee",
        drop_in_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(circle).toBeTruthy();
    expect(circle!.status).toBe("active");
    createdCircleId = circle!.id;

    const expectedLabel = `${TOPIC} @ ${SPOT}`;

    const { data: group, error: groupErr } = await admin
      .from("groups")
      .select("*")
      .eq("type", "circle")
      .eq("label", expectedLabel)
      .maybeSingle();

    expect(groupErr).toBeNull();
    expect(group).toBeTruthy();
    createdGroupId = group!.id;

    const { data: member, error: memberErr } = await admin
      .from("group_members")
      .select("*")
      .eq("group_id", group!.id)
      .eq("user_id", STUDENT_ID)
      .maybeSingle();

    expect(memberErr).toBeNull();
    expect(member).toBeTruthy();
  });
});
