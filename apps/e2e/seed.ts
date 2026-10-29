import {
  admin,
  customer,
  friend,
  PASSWORD,
  product,
  signUpUser,
  staff,
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
  check(await db.from("cart_kits").delete().eq("user_id", id));
  check(await db.from("cart_plus_gifts").delete().eq("user_id", id));
  check(await db.from("cart_auctions").delete().eq("user_id", id));
  // No requests for offers from shops (their offers and messages go too).
  check(await db.from("sell_requests").delete().eq("user_id", id));
  // No listings of their own (their deals and messages go too).
  check(await db.from("member_listings").delete().eq("user_id", id));
  // No program applications (their installments and cart lines go too).
  check(await db.from("program_applications").delete().eq("user_id", id));
  check(await db.from("wishlist_items").delete().eq("user_id", id));
  check(await db.from("plus_homes").delete().eq("user_id", id));
  check(await db.from("plus_waitlist").delete().eq("user_id", id));
  check(await db.from("notifications").delete().eq("user_id", id));
  // Not verified: no identity check or educator badge, nothing in review.
  check(await db.from("verification_requests").delete().eq("user_id", id));
  check(await db.from("identity_verifications").delete().eq("user_id", id));
  check(await db.from("educator_badges").delete().eq("user_id", id));
  // No saved addresses, no remembered way to pay.
  check(await db.from("user_addresses").delete().eq("user_id", id));
  check(
    await db.from("profiles").update({ checkout_payment: null }).eq("id", id)
  );
  // An adult, so orders need no guardian; earlier rentals are given back.
  check(
    await db
      .from("profiles")
      .update({ birthday: "1995-04-20" })
      .eq("id", id)
      .is("birthday", null)
  );
  check(
    await db
      .from("orders")
      .update({ status: "cancelled" })
      .eq("user_id", id)
      .in("status", ["pending", "confirmed"])
  );
  check(
    await db.from("notifications").insert({
      event: "e2e_notice",
      kind: "system",
      link: "/support",
      user_id: id,
    })
  );
  return id;
};

/** The customer's friend, who claims gifts. */
export const resetFriend = async () => {
  await ensureUser(friend.email, friend.name);
};

/**
 * The friend without Plus but with a home in Baghdad, so gifted Plus
 * months can start it.
 */
export const resetFriendForPlus = async () => {
  const db = admin();
  const id = await ensureUser(friend.email, friend.name);
  check(
    await db
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", id)
      .in("status", ["incomplete", "active", "past_due"])
  );
  check(
    await db
      .from("profiles")
      .update({ birthday: "1996-02-11" })
      .eq("id", id)
      .is("birthday", null)
  );
  const { data: area } = await db
    .from("plus_areas")
    .select("id")
    .eq("active", true)
    .order("position")
    .limit(1)
    .single();
  check(
    await db.from("plus_homes").upsert({
      address: "Street 14",
      area_id: area?.id ?? "",
      phone: "+9647701234568",
      user_id: id,
    })
  );
  return id;
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

/** No Pass yet for the new member's address, so signing in creates it. */
export const resetSignUpUser = async () => {
  const found = await findUser((u) => u.email === signUpUser.email);
  if (found) {
    check(await admin().auth.admin.deleteUser(found.id));
  }
};

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

/** The customer's company ("E2E Company"), owned by them, with no requests. */
export const resetCompany = async () => {
  const db = admin();
  const userId = await ensureUser(customer.email, customer.name);
  // A shop's copies and the kit units it lent keep the shop (no cascade):
  // remove them first.
  const { data: shops } = await db
    .from("sellers")
    .select("id, organization:organizations!inner (slug)")
    .eq("organization.slug", "e2e-company");
  for (const shop of shops ?? []) {
    check(await db.from("stock_items").delete().eq("seller_id", shop.id));
    check(await db.from("kit_units").delete().eq("seller_id", shop.id));
  }
  check(await db.from("organizations").delete().eq("slug", "e2e-company"));
  const { data, error } = await db
    .from("organizations")
    .insert({ created_by: userId, name: "E2E Company", slug: "e2e-company" })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  check(
    await db
      .from("organization_members")
      .insert({ organization_id: data.id, role: "owner", user_id: userId })
  );
  return data.id;
};

/** A partner app that may show the live card, framed from https://sal.test. */
export const embedPartner = {
  clientId: "pass_e2eembed0000000000000000",
  name: "E2E Society",
  origin: "https://sal.test",
};

export const seedEmbedPartner = async () => {
  const db = admin();
  const organizationId = await resetCompany();
  check(
    await db.from("pass_partner_domains").insert({
      domain: "sal.test",
      organization_id: organizationId,
      verified_at: new Date().toISOString(),
    })
  );
  check(
    await db
      .from("pass_partners")
      .delete()
      .eq("client_id", embedPartner.clientId)
  );
  // Set by staff, so the answers are approved as they are.
  check(
    await db.from("pass_partners").insert({
      active: true,
      answers: ["profile", "card_embed"],
      client_id: embedPartner.clientId,
      mode: "live",
      name: embedPartner.name,
      organization_id: organizationId,
      redirect_uris: [`${embedPartner.origin}/cb`],
      secret_hash: "0".repeat(64),
      website: embedPartner.origin,
    })
  );
};
