/**
 * Runs against a local Supabase stack with its mail catcher (Mailpit).
 * Export the values printed by `supabase status -o env` (API_URL,
 * PUBLISHABLE_KEY, MAILPIT_URL), then:
 *   SUPABASE_INTEGRATION=1 bun run --cwd packages/auth test
 * Signs up and in with email codes, read from Mailpit.
 */
import type { Database } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test } from "vitest";
import { listMyOrganizations, pickActiveOrganization } from "./organizations";
import { sendEmailOtp, verifyEmailOtp } from "./otp";

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const mailpit = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const CODE = /\b(\d{8})\b/;

interface MailpitSummary {
  Created: string;
  ID: string;
}

/** The newest code emailed to `email` after `since`, from Mailpit. */
const readCode = async (email: string, since: number) => {
  const query = new URLSearchParams({ query: `to:"${email}"` });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: polls until the email lands
    const response = await fetch(`${mailpit}/api/v1/search?${query}`);
    const { messages = [] } = (await response.json()) as {
      messages?: MailpitSummary[];
    };
    const latest = messages.find(
      (message) => Date.parse(message.Created) >= since - 1000
    );
    if (latest) {
      const message = (await (
        await fetch(`${mailpit}/api/v1/message/${latest.ID}`)
      ).json()) as { Text: string };
      const code = CODE.exec(message.Text)?.[1];
      if (code) {
        return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No code emailed to ${email}`);
};

describe.skipIf(!(process.env.SUPABASE_INTEGRATION && publishableKey))(
  "auth (local Supabase)",
  () => {
    let supabase: ReturnType<typeof createClient<Database>>;
    const email = `auth-${Date.now()}@theidea.test`;

    beforeAll(() => {
      supabase = createClient<Database>(url, publishableKey, {
        auth: { persistSession: false },
      });
    });

    test("sign-in only refuses an unknown address", async () => {
      const result = await sendEmailOtp(supabase, email, {
        shouldCreateUser: false,
      });
      expect(result).toMatchObject({ code: "no_account", ok: false });
    });

    test("signs up with an email code and works inside an organization", async () => {
      const since = Date.now();
      const sent = await sendEmailOtp(supabase, ` ${email.toUpperCase()} `, {
        fullName: "Test User",
        locale: "en",
      });
      expect(sent).toMatchObject({ email, ok: true });

      const verified = await verifyEmailOtp(
        supabase,
        email,
        await readCode(email, since)
      );
      expect(verified.ok).toBe(true);
      const userId = verified.ok ? verified.value.userId : "";

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, locale")
        .eq("id", userId)
        .single();
      expect(profile?.full_name).toBe("Test User");

      const slug = `org-${Date.now()}`;
      const { data: organization, error } = await supabase.rpc(
        "create_organization",
        { org_name: "Integration Org", org_slug: slug }
      );
      expect(error).toBeNull();

      const organizations = await listMyOrganizations(supabase, userId);
      expect(
        pickActiveOrganization(organizations, organization?.id)
      ).toMatchObject({
        role: "owner",
        slug,
      });

      const { error: insertError } = await supabase.from("projects").insert({
        created_by: userId,
        name: "First",
        organization_id: organization?.id ?? "",
      });
      expect(insertError).toBeNull();

      // Billing tables are read-only for users, even owners.
      const { error: forged } = await supabase.from("payments").insert({
        amount: 1000,
        organization_id: organization?.id,
        provider: "wayl",
        reference_id: `forged-${slug}`,
      });
      expect(forged?.code).toBe("42501");

      await supabase.auth.signOut();
    });

    test("signs in again to the same account with a new code", async () => {
      const since = Date.now();
      const sent = await sendEmailOtp(supabase, email, {
        shouldCreateUser: false,
      });
      expect(sent.ok).toBe(true);
      const verified = await verifyEmailOtp(
        supabase,
        email,
        await readCode(email, since)
      );
      expect(verified.ok).toBe(true);
      await supabase.auth.signOut();
    });

    test("rejects a wrong code", async () => {
      await sendEmailOtp(supabase, email);
      const result = await verifyEmailOtp(supabase, email, "000000");
      expect(result).toMatchObject({ code: "invalid_code", ok: false });
    });
  }
);
