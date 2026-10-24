import {
  admin,
  customer,
  PASSWORD,
  phoneUser,
  product,
  staff,
} from "./fixtures";

/**
 * Seeds what the journeys need, idempotently, so they also pass right after
 * `db:reset`: a customer who finished onboarding (empty cart and wishlist,
 * one unread notice), a staff member with no authenticator linked yet, an
 * in-stock product, and no account yet for the phone sign-up number.
 */
type Db = ReturnType<typeof admin>;

const findUser = async (db: Db, match: (u: { email?: string; phone?: string }) => boolean) => {
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw error;
    }
    const found = data.users.find(match);
    if (found || data.users.length < 200) {
      return found;
    }
  }
  return undefined;
};

const ensureUser = async (db: Db, email: string, name: string) => {
  const found = await findUser(db, (u) => u.email === email);
  const id =
    found?.id ??
    (await db.auth.admin
      .createUser({
        email,
        email_confirm: true,
        password: PASSWORD,
        user_metadata: { full_name: name },
      })
      .then(({ data, error }) => {
        if (error || !data.user) {
          throw error ?? new Error(`${email} not created`);
        }
        return data.user.id;
      }));
  // Keeps the password known and the account usable after earlier runs.
  await db.auth.admin.updateUserById(id, {
    ban_duration: "none",
    password: PASSWORD,
  });
  // Saving the profile marks onboarding as done (updated_at > created_at).
  const { error } = await db
    .from("profiles")
    .update({ banned_at: null, full_name: name, locale: "en" })
    .eq("id", id);
  if (error) {
    throw error;
  }
  return id;
};

const check = ({ error }: { error: unknown }) => {
  if (error) {
    throw error;
  }
};

export default async function globalSetup() {
  const db = admin();

  const customerId = await ensureUser(db, customer.email, customer.name);
  check(await db.from("cart_items").delete().eq("user_id", customerId));
  check(await db.from("wishlist_items").delete().eq("user_id", customerId));
  check(await db.from("notifications").delete().eq("user_id", customerId));
  check(
    await db.from("notifications").insert({
      event: "e2e_notice",
      kind: "system",
      link: "/support",
      user_id: customerId,
    })
  );

  const staffId = await ensureUser(db, staff.email, staff.name);
  check(
    await db
      .from("staff")
      .upsert(
        { role: "admin", title: "E2E", user_id: staffId },
        { onConflict: "user_id" }
      )
  );
  // The journey links an authenticator app from scratch each run.
  const factors = await db.auth.admin.mfa.listFactors({ userId: staffId });
  for (const factor of factors.data?.factors ?? []) {
    await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId: staffId });
  }

  // The phone journey is a real sign-up: drop the account if it exists.
  const phone = await findUser(db, (u) => u.phone === phoneUser.phone);
  if (phone) {
    await db.auth.admin.deleteUser(phone.id);
  }

  check(
    await db.from("products").upsert(
      {
        condition: "new",
        description_ar: "مصباح مكتب يستخدم في الاختبارات الآلية.",
        description_en: "A desk lamp used by the automated tests.",
        kind: "sale",
        name_ar: product.nameAr,
        name_en: product.name,
        price: 25_000,
        slug: product.slug,
        status: "active",
        stock_count: 50,
      },
      { onConflict: "slug" }
    )
  );
}
