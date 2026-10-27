# The IDEA Design

The staff-only design site at staff.theideaiq.com/design: every component
in `@repo/design-system` and every email in `@repo/email`, in Arabic and
English.

```sh
bun run dev     # Storybook on http://localhost:6006 (no gate)
bun run build   # the static build in storybook-static/
```

The IDEA Partners (`apps/partners`) copies the build into `public/design`
when it builds, and its `proxy.ts` serves it on the staff host only, behind
`lib/design-gate.ts`: staff with an authenticator-app (aal2) session from
The IDEA Pass. See "The IDEA Design" in `ARCHITECTURE_AND_INTEGRATIONS.md`.
Files Storybook serves as-is (the favicon) live in `assets/`.
