import { describe, expect, test } from "vitest";
import { createModerator, findBannedWord } from "./engine";
import {
  collapseRepeats,
  detectScript,
  normalizeLatin,
  normalizeText,
} from "./normalize";
import { jaroWinkler } from "./similarity";
import { detectSpam } from "./spam";
import { stemArabic } from "./stem";
import { bannedWords } from "./words";

describe("normalisation", () => {
  test("strips harakat, tatweel and invisible characters", () => {
    expect(normalizeText("كُسـّـك")).toBe("كسك");
    expect(normalizeText("f​u‍ck")).toBe("fuck");
  });

  test("maps Kurdish and Persian letters to Arabic", () => {
    expect(normalizeText("نیک")).toBe("نيك");
    expect(normalizeText("کس")).toBe("كس");
    expect(normalizeText("گواد")).toBe("كواد");
    expect(normalizeText("شەرموطە")).toBe("شرموطه");
    expect(normalizeText("أإآ")).toBe("ااا");
  });

  test("folds leetspeak, accents and Cyrillic look-alikes", () => {
    expect(normalizeLatin("Sl00t")).toBe("sloot");
    expect(normalizeLatin("wh0r3")).toBe("whore");
    expect(normalizeLatin("ѕlut")).toBe("slut");
    expect(normalizeLatin("dïck")).toBe("dick");
  });

  test("collapses stretched letters", () => {
    expect(collapseRepeats("sluuuut")).toBe("slut");
    expect(collapseRepeats("كسسس")).toBe("كس");
  });

  test("detects the script of a token", () => {
    expect(detectScript("مرحبا")).toBe("arabic");
    expect(detectScript("hello")).toBe("latin");
    expect(detectScript("你好")).toBe("han");
    expect(detectScript("123")).toBe("other");
  });

  test("full-width letters are normalised", () => {
    expect(normalizeText("ｓｌｕｔ")).toBe("slut");
  });
});

describe("helpers", () => {
  test("Jaro-Winkler similarity", () => {
    expect(jaroWinkler("martha", "martha")).toBe(1);
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 3);
    expect(jaroWinkler("abc", "xyz")).toBe(0);
    expect(jaroWinkler("", "")).toBe(1);
  });

  test("light Arabic stemming", () => {
    expect(stemArabic("والكتاب")).toBe("كتاب");
    expect(stemArabic("كتابهم")).toBe("كتاب");
    // Too short to strip: stays whole.
    expect(stemArabic("كس")).toBe("كس");
  });

  test("the word list drops reviewed over-matchers", () => {
    for (const word of ["hoe", "kink", "fetish", "bimbo", "cao", "luo"]) {
      expect(bannedWords.english).not.toContain(word);
    }
  });
});

describe("banned words: English", () => {
  test.each([
    "you are a slut",
    "SLUT!",
    "what a wh0r3",
    "sluuuuut",
    "s.l.u.t",
    "s l u t",
    "p*ssy",
    "c#nt",
    "f a g g o t",
    "blow job",
    "kill yourself",
    "kill your self",
    "nigg3r",
    "ѕlut",
  ])("flags %s", (text) => {
    expect(findBannedWord(text)).not.toBeNull();
  });

  test.each([
    "Scunthorpe United won",
    "a cocktail party",
    "Dickens wrote novels",
    "the hoe is in the garden shed",
    "I have a kink in my neck",
    "graduated cum laude",
    "a raccoon in the yard",
    "the dollar is pegged",
    "Japanese shota and lolita are book titles",
    "cao and luo are common surnames",
    "assassin's creed is on sale",
    "classic pass, grass and bass",
    "Matsushita ships analysis tools",
    "check https://theideaiq.com/en/store",
    "I'll kill you in Fortnite tonight",
    "therapist recommended",
    "a grape and a drape",
  ])("leaves %s alone", (text) => {
    expect(findBannedWord(text)).toBeNull();
  });

  test("reports why it matched", () => {
    expect(findBannedWord("slut")?.reason).toBe("exact");
    expect(findBannedWord("sluuut")?.reason).toBe("stretched");
    expect(findBannedWord("p*ssy")?.reason).toBe("masked");
    expect(findBannedWord("s.l.u.t")?.reason).toBe("joined");
    expect(findBannedWord("kill yourself")?.reason).toBe("phrase");
  });

  test("emoji and symbols don't stop the scan", () => {
    // The 2022 tokenizer returned early on the first emoji.
    expect(findBannedWord("😀😀 hello 🎮 slut")).not.toBeNull();
    expect(findBannedWord("🔥🔥🔥")).toBeNull();
  });
});

describe("banned words: Arabic and Kurdish spellings", () => {
  test.each([
    "كس اختك",
    "كُسّ",
    "كســك",
    "انت شرموطه",
    "انتِ شرموطة",
    "شەرموطە",
    "یا گواد",
    "نیک",
    "ك س",
    "كسسسس",
    "والكواد",
    "طيزك",
    "يا ديوث",
    "منيوك",
  ])("flags %s", (text) => {
    expect(findBannedWord(text)).not.toBeNull();
  });

  test.each([
    "هناك كتاب جديد في المتجر",
    "كسرت الشاشة",
    "الكسل ليس حلاً",
    "زبون جديد اشترى بلايستيشن",
    "زبدة وخبز",
    "نيكون كاميرا ممتازة؟ لا، كانون",
    "عيرت الساعة",
    "قرأت الكتاب ثم كسبت الجائزة",
    "عكس ذلك صحيح",
    "مكسرات وحلويات",
    "طيزنابادي اسم منطقة",
    "مرحبا بالجميع في نادي الفكرة",
    "شنو سعر بلايستيشن ٥؟",
    "فكسبنا المباراة",
  ])("leaves %s alone", (text) => {
    expect(findBannedWord(text)).toBeNull();
  });
});

describe("banned words: Chinese", () => {
  test("matches inside a run of characters", () => {
    expect(findBannedWord("你这个婊子")?.language).toBe("chinese");
  });

  test("leaves everyday words alone", () => {
    expect(findBannedWord("我们操作系统很好")).toBeNull();
    expect(findBannedWord("菊花茶")).toBeNull();
  });
});

describe("custom lists", () => {
  test("a moderator can use its own words", () => {
    const moderator = createModerator({
      arabic: ["كلمه"],
      chinese: [],
      english: ["badword"],
      phrases: ["very bad"],
    });
    expect(moderator.find("BADWORD")).not.toBeNull();
    expect(moderator.find("الكلمه")).not.toBeNull();
    expect(moderator.find("this is very bad")).not.toBeNull();
    expect(moderator.find("slut")).toBeNull();
  });
});

describe("investment spam", () => {
  test.each([
    "Earn $500 daily trading crypto, DM me now",
    "Guaranteed profits with Bitcoin investment! Contact t.me/richfast",
    "I made 300% returns with forex, inbox me",
    "استثمر معنا في العملات الرقمية واربح ارباح يومية مضمونة راسلني",
    "تداول بيتكوين ربح يومي 500 دولار للتواصل واتساب",
    "USDT investment, withdraw daily, message me @fastmoney_iq",
  ])("flags %s", (text) => {
    expect(detectSpam(text).spam).toBe(true);
  });

  test.each([
    "Is Bitcoin a good idea? What do you think?",
    "Investing in education is the best return",
    "The game has a profit system and daily quests",
    "Trade in your PS4 and earn store credit",
    "I work at a nonprofit, contact me about volunteering",
    "Does anyone sell a NFT book?",
    "شنو رأيكم بالاستثمار بالتعليم؟",
    "سحب الجائزة يوم الخميس",
    "Pay with Wayl: 25,000 IQD",
    "debt and death are different words",
  ])("leaves %s alone", (text) => {
    expect(detectSpam(text).spam).toBe(false);
  });

  test("explains its verdict", () => {
    expect(detectSpam("bitcoin profits, dm me").reasons).toEqual([
      "investment",
      "promise",
      "contact",
    ]);
  });
});
