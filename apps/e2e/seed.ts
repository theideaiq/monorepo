import {
  admin,
  customer,
  PASSWORD,
  product,
  signUpUser,
  staff,
  unknownEmail,
} from "./fixtures";

/**
 * The data the journeys start from, set up idempotently with the service-role
 * key (so it also works right after `db:reset`). Global setup runs all of it;
 * each journey resets the part it changes, so tests can repeat in any order.
 */

const check = ({ error }: { error: unknown }) => {
  if (error) {
    throw error;
  }
};

const findUser = async (match: (u: { email?: string }) => boolean) => {
  const db = admin();
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
};

/** A confirmed password account that has finished onboarding. */
const ensureUser = async (email: string, name: string) => {
  const db = admin();
  const found = await findUser((u) => u.email === email);
  let id = found?.id;
  if (!id) {
    const created = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      password: PASSWORD,
      user_metadata: { full_name: name },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error(`${email} not created`);
    }
    ({ id } = created.data.user);
  }
  // Keeps the password known and the account usable after earlier runs.
  check(
    await db.auth.admin.updateUserById(id, {
      ban_duration: "none",
      password: PASSWORD,
    })
  );
  // Saving the profile marks onboarding as done (updated_at > created_at).
  check(
    await db
      .from("profiles")
      .update({ banned_at: null, full_name: name, locale: "en" })
      .eq("id", id)
  );
  return id;
};

/** The customer: empty cart and wishlist, one unread notice. */
export const resetCustomer = async () => {
  const db = admin();
  const id = await ensureUser(customer.email, customer.name);
  check(await db.from("cart_items").delete().eq("user_id", id));
  check(await db.from("wishlist_items").delete().eq("user_id", id));
  check(await db.from("notifications").delete().eq("user_id", id));
  check(
    await db.from("notifications").insert({
      event: "e2e_notice",
      kind: "system",
      link: "/support",
      user_id: id,
    })
  );
};

/** A staff member (admin role) with no authenticator app linked yet. */
export const resetStaff = async () => {
  const db = admin();
  const id = await ensureUser(staff.email, staff.name);
  check(
    await db
      .from("staff")
      .upsert(
        { role: "admin", title: "E2E", user_id: id },
        { onConflict: "user_id" }
      )
  );
  const factors = await db.auth.admin.mfa.listFactors({ userId: id });
  check(factors);
  for (const factor of factors.data?.factors ?? []) {
    check(await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId: id }));
  }
};

/**
 * No account yet for the sign-up address (nor for the address that never
 * has one), so signing up creates it.
 */
export const resetSignUpUser = async () => {
  for (const email of [signUpUser.email, unknownEmail]) {
    const found = await findUser((u) => u.email === email);
    if (found) {
      check(await admin().auth.admin.deleteUser(found.id));
    }
  }
};

/** Whether an account with this email exists. */
export const accountExists = async (email: string) =>
  Boolean(await findUser((u) => u.email === email));

/** An in-stock product of the journeys' own. */
export const ensureProduct = async () => {
  check(
    await admin().from("products").upsert(
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
};
