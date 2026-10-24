# The IDEA Design

The staff-only design site at design.theideaiq.com: every component in
`@repo/design-system` and every email in `@repo/email`, in Arabic and
English.

```sh
bun run dev     # Storybook on http://localhost:6006 (no gate)
bun run build   # storybook build -o public, then next build
bun run start   # the gated site on http://localhost:6006 (needs .env.local)
bun run test    # the gate's unit tests
```

`proxy.ts` and `lib/gate.ts` let in only staff with an authenticator-app
(aal2) session from The IDEA Pass; see "The IDEA Design" in
`ARCHITECTURE_AND_INTEGRATIONS.md`. Files Storybook serves as-is (the
favicon) live in `assets/`; `public/` is build output.
