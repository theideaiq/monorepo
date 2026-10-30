import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://db.example.com",
    NEXT_PUBLIC_WEB_URL: "https://theideaiq.com",
  },
}));

const { buildPosts } = await import("./telegram-posts");

type Sources = Parameters<typeof buildPosts>[0];

const product = (n: number) =>
  ({
    id: `p${n}`,
    images: [`products/${n}.webp`],
    name_ar: `منتج ${n}`,
    name_en: `Product ${n}`,
    price: 10_000 * n,
    slug: `product-${n}`,
  }) as Sources["products"][number];

const empty: Sources = { events: [], posts: [], products: [] };

describe("buildPosts", () => {
  it("links a news post in the chat's language, with its cover", () => {
    const { news } = buildPosts(
      {
        ...empty,
        posts: [
          {
            cover_image: "covers/a.webp",
            excerpt_ar: "ملخص",
            excerpt_en: "Summary",
            slug: "launch",
            title_ar: "إطلاق",
            title_en: "Launch",
          } as Sources["posts"][number],
        ],
      },
      "ar"
    );
    expect(news).toEqual([
      {
        buttonLabel: "اقرأ المزيد",
        lines: ["ملخص"],
        photo:
          "https://db.example.com/storage/v1/object/public/editorial/covers/a.webp",
        title: "إطلاق",
        url: "https://theideaiq.com/ar/club/read/launch",
      },
    ]);
  });

  it("posts one new product on its own and several as a list", () => {
    const one = buildPosts({ ...empty, products: [product(1)] }, "en");
    expect(one.arrivals[0]?.url).toBe("https://theideaiq.com/store/product-1");
    expect(one.arrivals[0]?.title).toBe("New in The IDEA store: Product 1");

    const many = buildPosts(
      {
        ...empty,
        products: Array.from({ length: 10 }, (_, i) => product(i + 1)),
      },
      "en"
    );
    expect(many.arrivals).toHaveLength(1);
    expect(many.arrivals[0]?.lines).toHaveLength(9);
    expect(many.arrivals[0]?.lines.at(-1)).toBe("and 2 more");
    expect(many.arrivals[0]?.url).toBe(
      "https://theideaiq.com/store?sort=newest"
    );
  });

  it("only sends https photos Telegram can fetch", () => {
    const { arrivals } = buildPosts(
      {
        ...empty,
        products: [{ ...product(1), images: [] }],
      },
      "en"
    );
    expect(arrivals[0]?.photo).toBeNull();
  });
});
