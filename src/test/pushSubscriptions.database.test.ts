import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL;
const sql = databaseUrl ? postgres(databaseUrl, { max: 1, prepare: false }) : null;
const rollback = new Error("Rollback push subscription test");

async function isolatedTest(run: (tx: postgres.TransactionSql, owners: string[]) => Promise<void>) {
  if (!sql) throw new Error("Database test connection unavailable");
  try {
    await sql.begin(async (tx) => {
      const profiles = await tx<{ user_id: string }[]>`SELECT user_id FROM public.profiles ORDER BY user_id LIMIT 2`;
      expect(profiles).toHaveLength(2);
      await run(tx, profiles.map((row) => row.user_id));
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

afterAll(async () => { await sql?.end(); });

describe.skipIf(!sql)("Push subscription live schema rules (rolled back)", () => {
  it("enables RLS and scopes all four operations to the owner", async () => {
    if (!sql) throw new Error("Database test connection unavailable");
    const table = await sql`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_subscriptions'::regclass`;
    expect(table[0]?.relrowsecurity).toBe(true);
    const policies = await sql`SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' ORDER BY cmd`;
    expect(policies.map((row) => row.cmd)).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
    for (const policy of policies) {
      expect(policy.roles).toBe("{authenticated}");
      if (policy.cmd !== "INSERT") expect(policy.qual).toMatch(/auth.uid\(\).* = user_id/s);
      if (policy.cmd === "INSERT" || policy.cmd === "UPDATE") expect(policy.with_check).toMatch(/auth.uid\(\).* = user_id/s);
    }
  });

  it("grants authenticated CRUD but denies every anonymous table privilege", async () => {
    if (!sql) throw new Error("Database test connection unavailable");
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      const rows = await sql`SELECT has_table_privilege('anon', 'public.push_subscriptions', ${privilege}) AS anon, has_table_privilege('authenticated', 'public.push_subscriptions', ${privilege}) AS authenticated`;
      expect(rows[0]?.anon).toBe(false);
      expect(rows[0]?.authenticated).toBe(true);
    }
  });

  it("keeps metadata nullable and enforces unique endpoints and profile cascade", async () => {
    await isolatedTest(async (tx) => {
      const columns = await tx`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name IN ('event_kind', 'sender_id', 'push_tag') ORDER BY column_name`;
      expect(columns.map((row) => [row.column_name, row.is_nullable, row.column_default])).toEqual([
        ["event_kind", "YES", null], ["push_tag", "YES", null], ["sender_id", "YES", null],
      ]);
      const constraints = await tx`SELECT contype, confdeltype, confrelid::regclass::text AS target FROM pg_constraint WHERE conrelid = 'public.push_subscriptions'::regclass`;
      expect(constraints.some((row) => row.contype === "f" && row.confdeltype === "c" && row.target === "profiles")).toBe(true);
      expect(constraints.some((row) => row.contype === "u")).toBe(true);
    });
  });
});