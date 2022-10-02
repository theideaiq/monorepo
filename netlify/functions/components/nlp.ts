import { format, tokens, tokenize, arabic, english } from "@components/elpers";
import { wocache } from "@components/shard";
import natrual from "natural";
import Stemmer from "arabic-stem";

const stemmer = new Stemmer();
const { JaroWinklerDistance: jarodist } = natrual;

// the natrual tokenizer doesn't work great for this use, so i had to write a custom one
const $ = (lang: string, token?: string) =>
	token ? RegExp(`\\p{sc=${lang}}+`, "u").test(token) : false;

function* tokenize(text: string) {
	const emoji =
		/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
	const noneLetter = /[^\p{L}]+/gu;

	const cleaned = text.replace(emoji, "");
	const tokens = cleaned.split(noneLetter).filter((el) => el !== "و"),
		len = tokens.length; // th@ng -> /th.*ng/ && [th, ng]
	if (emoji.test(text)) return;

	for (let dex = 0; dex < len; dex++) {
		const token: [string, string | undefined] = [stripurl(tokens[dex]), stripurl(tokens[dex + 1])];
		let langCode: "english" | "arabic" | "chinese" | "none" = "arabic";

		switch (true) {
			case $("Arabic", token[0]):
				token[0] = stem(token[0]);
				if (token[1] && $("Arabic", token[1])) token[1] = stem(token[1]);
				break;
			case $("Common", token[0]): // common is english for racist reasons
				langCode = "english";
				break;
			case $("Han", token[0]):
				langCode = "chinese";
				break;
			default:
				langCode = "none";
				break;
		} // i wish there could be heaven, where earth isn't seen unitl the day god flutters and kills everything there has been
		const tempken = <[string, string | undefined]>token.map((tkn) =>
			tkn
				? cleanArb(tkn.toLocaleLowerCase())
						.replace(/(^[^\p{L}]+|[^\p{L}]+$)/gu, "")
						.replace(noneLetter, ".*")
				: undefined,
		);
		yield {
			langCode,
			tokens: [
				tempken[0],
				...(tempken[1] ? [tempken[0] + " " + tempken[1], tempken[0] + tempken[1]] : [undefined]),
			],
		};
		if (noneLetter.test(token[0])) {
			yield {
				second: "test",
				langCode,
				tokens: token[0].split(noneLetter),
			};
		}
	}
}
const stem = (str: string) => {
	const { stem } = stemmer.stem(str);
	if (!stem.length) return str;
	const affix = stemmer.affixCleaner;

	if (affix?.prefix !== "" && !affix?.isValidPrefix(affix.prefix)) {
		return affix?.token.substring(0, affix.token.length - affix.suffix.length);
	}
	return affix.removeAll();
};

const cleanArb = (text: string) => {
	if (!/\p{Script=Arabic}/u.test(text)) return text;
	text = pregReplace(
		text,
		[/[کگ]/g, "ڤ", /[ێي]/g, /[ۆؤ]/g, "ڵ", "پ", "ژ", "ڕ"],
		["ك", "ف", "ي", "و", "ل", "ب", "ز", "ر"],
	);
	if (text[0] === "و") text = text.slice(1);
	return text;
};

const pregReplace = (text: string, pattern: Array<string | RegExp>, replaceto: string[]) => {
	const len = pattern.length,
		replen = replaceto.length;
	for (let dex = 0; dex < len; dex++) {
		const el = pattern[dex];
		text = replen === 1 ? text.replaceAll(el, replaceto[0]) : text.replaceAll(el, replaceto[dex]);
	}
	return text;
};
const regel = (pattern: string) => {
	const lst = Array.from(pattern),
		len = lst.length;
	pattern = "";
	for (let dex = 0; dex < len; dex++) {
		const lit = lst[dex];
		pattern += lit === "." || lit === "*" ? lit : lit + "+";
	}
	if ($("Arabic", pattern)) return RegExp("(?<![\u0621-\u064A])" + pattern + "(?![\u0621-\u064A])");
	return RegExp("\\b" + pattern + "\\b", "i");
};
const stripurl = (text: string) => {
	if (
		/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/.test(
			text,
		)
	) {
		text = pregReplace(
			text,
			[/https?:\/\/(www\.)?/g, /\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g],
			[""],
		);
	}
	return text;
};
const filter = (token: string) => new RegExp(`[${token}](?![^${token}])`);
const _matcher = (token: string, words: arabic | english, key: string) => {
	try {
		if (wocache.has(token)) return false;
		const array = words[key],
			len2 = array.length;
		for (let index = 0; index < len2; index++) {
			const word = array[index];
			if (!filter(token).test(word)) {
				wocache.set(token, true);
			} else if (token && (jarodist(token, word) > 0.96 || regel(word).test(token))) {
				return true;
			} else wocache.set(token, true);
		}
		return false;
	} catch (err) {
		return false;
	}
};
const matcher = (tokenslst: tokens, list: format): boolean => {
	const { langCode, tokens } = tokenslst;
	if (langCode === "none") return false;
	const words = list[langCode],
		len = words.length;
	const [token] = <[string, string | undefined, string | undefined]>tokens;

	if (langCode === "chinese") {
		const chinese = <format["chinese"]>words;
		for (let dex = 0; dex < len; dex++) {
			if (new RegExp(chinese[dex]).test(token)) return true;
		}
	}

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (
			token !== undefined &&
			_matcher(
				token,
				<arabic | english>words,
				index === 1 && langCode === "english" ? "doubles" : token[0],
			)
		)
			return true;
	}
	return false;
};

export default (text: string, list: format) => {
	for (const tokens of tokenize(text.replace(/[ًٌٍَُِّ]/g, ""))) {
		if (matcher(tokens, list)) return true;
	}
	return false;
};
