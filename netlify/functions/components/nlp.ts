import Stemmer from 'arabic-stem'
import natrual from "natural" 

const {LancasterStemmer, JaroWinklerDistance : jarodist} = natrual

const stemAb = (str : string) => {
	const val = new Stemmer().stem(cleanArb(str))
	const stemval = val.stem.map(el => jarodist(el, cleanArb(str)))
	return val.stem[stemval.indexOf(Math.max(...stemval))] ?? cleanArb(str)
}

// the natrual tokenizer doesn't work great for this use, so i had to write a custom one

const tokenize = (text: string) => {
	const tokens = text.trim().replace(/\.\s/g, ' ').split(/\s+/) , len = tokens.length // th*ng -> /th.ng/ && [th, ng]
	const out: string[] = []
	let lang : RegExp | boolean = arabic(text)
	for (let dex = 0; dex < len ; dex++) {
		let token = tokens[dex]
		if (lang) token = cleanArb(token)
		else if (lang = english(text)) {} // i wish there could be heaven, where earth isn't seen unitl the day god flutters and kills everything there has been
		else throw TypeError('unsupported language')		
		!lang.test(token)?
			out.push(token):
			out.push(
				token.replace(lang, '.*'),
				...token.split(lang)
			)
	}
	return out
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
		false

const arabic = (text: string) => 
	/[\u0600-\u06FF\u0750-\u077F]/.test(text)?
		/[^\u0600-\u06FF\u0750-\u077F]+/:
		false

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


const matcher = (token : string, list : format, optinalsecound?: string) : boolean => {
	let stem : ((str: string) => string) = stemAb
	let words : Array<string|[string, string][]> = []
	if (arabic(token)) {
		words = list.arabic
	} else if (english(token)) {
		stem = LancasterStemmer.stem
		words = list.english
	} 
	words = words.filter(word => {
		if (Array.isArray(word)) return true;
		return word.length <= token.length
	})
	
	token = stem(token)
	if (optinalsecound !== undefined) optinalsecound = token +" "+ stem(optinalsecound)
	
	const len = words.length
	for (let dex = 0; dex < len; dex++) {
		let word = words[dex]
		if (Array.isArray(word)) {
			const inlen = word.length
			for (let index = 0; index < inlen; index++) {
				const inword = word[index]
				const nested = stem(inword[0]) + ' ' + stem(inword[1])
				if (optinalsecound === undefined) continue;
				if ((jarodist(optinalsecound, nested) > .8999) || regel(optinalsecound).test(nested)) return true
			}
		} else {
            word = stem(word)
			if ((jarodist(token, word) > .8999) || regel(token).test(word)) return true
		}
	} 
	return false
}
export const compare = (text: string, list : format) => {
	const tokens = tokenize(text.replace(/[ًٌٍَُِّ]/g, '')), len = tokens.length
	for (let dex = 0; dex < len; dex++) {
		if (matcher(tokens[dex], list, tokens[dex+1])) 
			return true
	} 
	return false
}

export declare type format = {arabic: string[], english: Array<string|[string, string][]>}