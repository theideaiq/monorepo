/**
 * Runs against a local Supabase stack. Export the local keys printed by
 * `supabase status -o env` (API_URL, PUBLISHABLE_KEY, SECRET_KEY), then:
 *   SUPABASE_INTEGRATION=1 bun run --cwd packages/storage test
 * Signs in to a fresh account with an email code issued by the admin API.
 */
import type { Database } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test } from "vitest";
import {
  buckets,
  getOrganizationFileUrl,
  listOrganizationFiles,
  removeFiles,
  StorageError,
  uploadAvatar,
  uploadOrganizationFile,
} from "./index";

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SECRET_KEY ?? "";

describe.skipIf(
  !(process.env.SUPABASE_INTEGRATION && publishableKey && secretKey)
)("storage (local Supabase)", () => {
  const client = () =>
    createClient<Database>(url, publishableKey, {
      auth: { persistSession: false },
    });
  let supabase: ReturnType<typeof client>;
  let userId: string;
  let organizationId: string;

  beforeAll(async () => {
    supabase = client();
    // An email code for a fresh account, issued without sending an email.
    const admin = createClient<Database>(url, secretKey, {
      auth: { persistSession: false },
    });
    const email = `storage-${Date.now()}@theidea.test`;
    const { data: link, error } = await admin.auth.admin.generateLink({
      email,
      type: "magiclink",
    });
    if (error) {
      throw error;
    }
    const { data } = await supabase.auth.verifyOtp({
      email,
      token: link.properties.email_otp,
      type: "email",
    });
    userId = data.user?.id ?? "";

    const { data: organization } = await supabase.rpc("create_organization", {
      org_name: "Storage Org",
      org_slug: `storage-${Date.now()}`,
    });
    organizationId = organization?.id ?? "";
  });

  test("members upload, list and download organization files", async () => {
    const content = "سلام";
    const file = new File([content], "تقرير الربع الأول.txt", {
      type: "text/plain",
    });

    const stored = await uploadOrganizationFile(supabase, organizationId, file);
    expect(stored.name).toBe("تقرير الربع الأول.txt");
    expect(stored.path.startsWith(`${organizationId}/`)).toBe(true);

    const files = await listOrganizationFiles(supabase, organizationId);
    expect(files).toContainEqual(
      expect.objectContaining({
        name: "تقرير الربع الأول.txt",
        path: stored.path,
        size: new TextEncoder().encode(content).length,
      })
    );

    const signedUrl = await getOrganizationFileUrl(supabase, stored.path, {
      download: true,
      expiresIn: 60,
    });
    const response = await fetch(signedUrl);
    expect(await response.text()).toBe(content);
    expect(response.headers.get("content-disposition")).toContain(
      encodeURIComponent("تقرير")
    );

    // Signed-out visitors can't read private files.
    const { data: anonymous } = await client()
      .storage.from(buckets.orgFiles.id)
      .download(stored.path);
    expect(anonymous).toBeNull();

    await removeFiles(supabase, buckets.orgFiles.id, [stored.path]);
    expect(await listOrganizationFiles(supabase, organizationId)).toEqual([]);
  });

  test("non-members can't write into another organization's folder", async () => {
    const file = new File(["x"], "x.txt", { type: "text/plain" });
    await expect(
      uploadOrganizationFile(supabase, crypto.randomUUID(), file)
    ).rejects.toBeInstanceOf(StorageError);
  });

  test("avatars are public and limited to images", async () => {
    // A 1×1 PNG.
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      ),
      (char) => char.charCodeAt(0)
    );
    const avatar = await uploadAvatar(
      supabase,
      userId,
      new File([png], "me.png", { type: "image/png" })
    );
    expect((await fetch(avatar.url)).status).toBe(200);

    await expect(
      uploadAvatar(
        supabase,
        userId,
        new File(["GIF89a"], "me.gif", { type: "image/gif" })
      )
    ).rejects.toMatchObject({ code: "type_not_allowed" });

    await removeFiles(supabase, buckets.avatars.id, [avatar.path]);
  });
});
