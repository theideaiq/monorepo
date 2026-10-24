# Progress

The working checklist for launch: what is done, what is left, what needs an
owner's decision. Agents and contributors read this first (see `AGENTS.md`)
and continue from the first unticked item. Tick items as they land; record
decisions with a date.

## Done

- [x] One repository: website, customer app (web + iOS/Android), back office,
      API and Telegram bot on the template base (PR #945).
- [x] The old apps' features rebuilt on the new schema: store, Plus rentals
      with tiers, wishlists, reviews, support tickets, notifications,
      editorial, CRM, marketing, ledger with scenarios, fixed assets, cap
      table (PR #951).
- [x] v1.0 hardening: advisors at zero, RPC bodies in `private`, structure
      and advisor pgTAP suites; patched Next.js/Storybook/Zod/sharp with
      `bun audit` in CI; strict Turborepo env; Knip; coverage; end-to-end
      journeys; secret scan of client bundles; CodeQL, production migration
      and nightly backup workflows; platform runbooks.

## Launch checklist (needs an owner with access)

- [ ] **Supabase:** `supabase db push` the new migrations (or let
      `migrate.yml` do it once its secrets are set). Turn on TOTP MFA
      (Authentication → Sign In / Providers → Multi-factor) — staff rights
      need an authenticator-app session. Set the Site URL and redirect URLs
      for the website, app and back office.
- [ ] **GitHub → Environments → `production`:** `SUPABASE_ACCESS_TOKEN`,
      `SUPABASE_DB_PASSWORD`, `BACKUP_PASSPHRASE`, optional
      `BACKUP_HEARTBEAT_URL`; repository variable `SUPABASE_PROJECT_REF`
      (`docs/platform/releases.md`).
- [ ] **GitHub → Code security:** switch CodeQL "default setup" off (it
      still lists the obsolete "Analyze (java-kotlin)"); `codeql.yml`
      replaces it.
- [ ] **The IDEA Design:** Vercel project `storybook` on
      `design.theideaiq.com` (DNS), with `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PASS_URL`; set
      `NEXT_PUBLIC_DESIGN_URL` where other apps link to it.
- [ ] **Vercel:** five projects (web, app, admin, api, storybook), each with
      Node 24, its environment variables (section 5 of
      `ARCHITECTURE_AND_INTEGRATIONS.md`) and "skip unaffected projects"
      on. Optional: `TURBO_TOKEN`/`TURBO_TEAM` for the remote cache.
- [ ] **Wayl:** production keys and the webhook URL
      (`/webhooks/payments` on the API host).
- [ ] **Telegram:** bot token and webhook (`apps/api/scripts/telegram-setup.ts`).
- [ ] **Domains:** once every subdomain serves HTTPS, submit the apex at
      hstspreload.org (the sites already send the preload header).
- [ ] **First staff member:** in the SQL editor,
      `insert into staff (user_id, role) values ('<user id>', 'superadmin')`;
      they then enroll an authenticator app in the back office.
- [ ] Delete the old branches on `theideaiq/monorepo` (the session's token
      is not allowed to).

## Open items

- [ ] Staff cannot open a support ticket on a customer's behalf.
- [ ] A staff reply on a closed ticket keeps it closed (by design today;
      decide whether it should reopen).
- [ ] Plan names are stored in English only; Arabic pages show the English
      name.
- [ ] `PRODUCT_CARD_COLUMNS` doesn't select `rental_tier`, so cards can't
      badge tiered rentals.
- [ ] `product_review_list.author_name` should be typed nullable.

## Decisions

- 2026-10-24: The IDEA keeps its staff-role model (`private.has_staff_role`
  with AAL2); auibsal's permission system was not adopted.
