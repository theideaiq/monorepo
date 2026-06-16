1. **Create ProductJsonLd Component**: Implement `ProductJsonLd.tsx` in `apps/web/src/components/seo/` to generate `application/ld+json` schema for products. This helps search engines understand the `Product` entity.
2. **Inject Schema in Product Page**: Update `apps/web/src/app/[locale]/product/[slug]/page.tsx` to include the `ProductJsonLd` component within the page layout so that it gets rendered.
3. **Verify Implementation**: Run `pnpm lint` and `pnpm format` to ensure code passes standards. Ensure the script renders correctly without visual regression.
4. **Log Learning**: Add entry to `.Jules/signal.md` concerning the explicit inclusion of Schema.org `Product` structured data in Next.js page views for core business entities.
5. **Complete Pre-commit Steps**: Call `pre_commit_instructions` and follow them to ensure tests, verification, and review are complete.
6. **Submit**: Create PR using `submit` with `📡 Signal: [SEO improvement]` format.
