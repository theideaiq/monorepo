import { Markup } from 'telegraf'

const isArabic = str => /[\u0600-\u06FF\u0750-\u077F]/.test(str)
// really really dumb way to check for words, doesn't work with special characters like . @ because of how regex works
export const regex = (str) => {
	const suffix = ['ك' ,'[ه|ة]' ,'نا' ,'ي' ,'ين' ,'ان' ,'ات' ,'بي' ,'بيك' ,'بيج' ,'مك' ,'مج' ,'مكم' ,'ون']
	.reduce((pre, curr) => pre +'|'+ curr)
	// made it a list so i can add more if needed since arabic ppl make new prefixes/prefixes each day
	const prefix = ["ن", "ت", "بال", "بل", "ك", "س", "ال", "ل", "ف", "ب", "ي", "و"] 
	.reduce((pre, curr) => pre +'|'+ curr)
	if(isArabic(str)){
		const signs = '[ًٌٍَُِّ]*'
		str = Array.from(str)
		.map(lit => {
			switch (lit) {
				case 'ا': return '[اأ]+' + signs
				case 'ه': return '[ةه]+' + signs
				case 'ك': return '[کگك]+' + signs
				case 'ف': return '[ڤف]+' + signs
				case 'ي': return '[ێيى]+' + signs
				case 'و': return '[وۆؤ]+' + signs
				case 'ل': return '[ڵل]+' + signs
				case 'ب': return '[پب]+' + signs
				case 'ز': return '[ژز]+' + signs
				case 'ر': return '[ڕر]+' + signs
				default : return lit + '+' + signs
			}
		}).reduce((pre, curr) => pre + curr)

		return RegExp(
			'\(?<![\u0621-\u064A])' + `(${prefix})?`
			+ str +
			`(${suffix})?` + '\(?![\u0621-\u064A])'
		)
	} else {
		str = Array.from(str)
		.map(lit => `[${lit.toUpperCase()+lit}]+`)
		.reduce((pre, curr) => pre + curr)
		return new RegExp('\\b' +str+'\\b')
	}
}
export const panel = [
	'welcome to the post droid', // temp message will have a better one later i think
	Markup.keyboard([
		['The post family links؜'],
		[
			"Unban request؜",
			'FAQ page؜'
		]
	])
	.resize(true)
	.placeholder('pick your pick')
]


export const splitArray = (array) => {
	const lst = [[],[]]
	array.forEach(el => {
		lst[0].push(el[0])	
		lst[1].push(el[1])
	})
	return lst
}
export const toUnicode = (string) => {
	return Array.from(string).reverse()
	.map(letter => {	
		const hex = letter.codePointAt(0).toString(16);
		return "0000".substring(0, 4 - hex.length) + hex;
	})
	.reduce((pre, curr) =>  pre += curr )
}