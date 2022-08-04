import natrual from "natural" 

const {JaroWinklerDistance : jarodist,} = natrual

// the natrual tokenizer doesn't work great for this use, so i had to write a custom one
export function* tokenize (text: string) {
	const tokens = text.trim().split(/\s+/) , len = tokens.length // th@ng -> /th.*ng/ && [th, ng]
	let lang : RegExp | undefined 
	for (let dex = 0; dex < len ; dex++) {
		let token = [stripurl(tokens[dex]), stripurl(tokens[dex+1]) ?? '' ]

		if (lang = arabic(token[0])) {
			token = token.map(tkn => 
				pregReplace(cleanArb(tkn), [/([^\u0600-\u06FF\u0750-\u077F]|\u061F+)$/g, /^([^\u0600-\u06FF\u0750-\u077F]|\u061F+)/g], [''])
			)
		}
		else if (lang = english(token[0])) {
			token = token.map(tkn => 
				pregReplace(tkn, [/([^\w]+)$/g, /^([^\w]+)/g], ['']).toLocaleLowerCase()
			)
		} // i wish there could be heaven, where earth isn't seen unitl the day god flutters and kills everything there has been
		else throw TypeError('unsupported language')
		yield token.map(tkn => tkn.replace(lang!, '.*'))
		if(lang.test(token[0])){
			yield token[0].split(lang)
		}
	}
}

const cleanArb = (text: string) => {
	text = pregReplace(text, [/[ًٌٍَُِّ]/g,/[کگ]/g,'ڤ',/[ێي]/g,/[ۆؤ]/g,'ڵ','پ','ژ','ڕ'], ["", "ك", "ف", "ي", "و", "ل", "ب", "ز", "ر"])
	if (text[0] === "و") text = shift(text)
	return text
}

const shift =  (text : string) => {
	const str = Array.from(text)
	if (str.shift() === undefined) throw RangeError("can't use shift with an empty string")
	return str.reduce((pre, curr) => pre + curr)
}
const english = (text : string) => 	
	/\w/.test(text)?
		/[^\w]+/:
		undefined

const arabic = (text: string) => 
	/[\u0600-\u06FF\u0750-\u077F]/.test(text)?
		/[^\u0600-\u06FF\u0750-\u077F]|\u061F+/:
		undefined

const pregReplace = (text: string, pattern: Array<string|RegExp>, replaceto: string[]) => {
	const len = pattern.length
	for (let dex = 0; dex < len ; dex++) {
		const el = pattern[dex]
		text = (replaceto.length === 1) ?
				text.replaceAll(el, replaceto[0]):
				text.replaceAll(el, replaceto[dex])	
	}
	return text
}

const regel = (pattern : string) => {
	const lst = Array.from(pattern), len = lst.length
	pattern = ""
	for (let dex = 0; dex < len; dex++) {
		const lit = lst[dex]
		pattern += (lit === "." || lit === "*")? lit : lit + '+'
	}
	if (arabic(pattern)) return RegExp("\(?<![\u0621-\u064A])" +pattern+ "\(?![\u0621-\u064A])")
	return RegExp("\\b" +pattern+ "\\b", 'i')
}

const stripurl = (text : string) => {
	if (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(text)) {
		text = pregReplace(text, [/https?:\/\/(www\.)?/g, /\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g], [''])
	}
	return text
}
const elper = (token : string, optinalsecound : string) => {

}
const filter = (token : string) => new RegExp("["+token+"]") 
const matcher = (token : string, list : format, optinalsecound?: string, ) : boolean => {
	let words : Array<string | string[]> = []
	if (arabic(token)) {
		words = list.arabic
	} else if (english(token)) {
		words = list.english
	} else if (/\p{Script=Han}/u.test(token)) {
		const chinese = list.chinese, len = words.length
		for (let dex = 0; dex < len; dex++) {
			if (new RegExp(chinese[dex]).test(token)) return true
		}
	}	
	let optinal : string
	if (optinalsecound !== undefined) {
		optinalsecound = token +" "+ optinalsecound
		optinal = token + optinalsecound
	}
	const len = words.length
	for (let dex = 0; dex < len; dex++) {
		let word = words[dex]
		if (Array.isArray(word)) {
			const inlen = word.length
			for (let index = 0; index < inlen; index++) {
				if (optinalsecound === undefined) continue;
				const nested = word[index]
				if ((jarodist(optinalsecound, nested) > .92) || regel(optinalsecound).test(nested)) return true
			}
		} else {
			if (!filter(token).test(word)) continue

			if ((jarodist(token, word) > .96) || regel(token).test(word)) return true
			if (optinal! && (jarodist(optinal, word) > .96 || regel(optinal).test(word))) return true			
		}
	} 
	return false
}

export const compare = (text: string, list : format) => {
	for (const [first, second] of tokenize(text.replace(/[ًٌٍَُِّ]/g, ''))) {
		if (matcher(first, list, second)) 
			return true
	}
	return false
}
export declare type format = { english: Array<string | string[]>; arabic: string[]; chinese: string[]; }