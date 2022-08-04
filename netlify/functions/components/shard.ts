import { Markup } from 'telegraf'
import LRU from "lru-cache"


export const panel : [string, {}]  = [
	'Welcome to The Post Droid!', // temp message will have a better one later i think
	Markup.keyboard([
		[
			"Unban Request؜",
			'FAQ؜'
		],
		['Links؜'],
		["Pin؜"]
	])
	.resize(true)
	.placeholder('pick your pick')
]

export const splitArray = <T>(array : T[][]) => {
	const lst : T[][] = [[],[]]
	const len = array.length
	for (let dex = 0; dex < len; dex++) {
		const el = array[dex]
		lst[0].push(el[0])	
		lst[1].push(el[1])
		
	}
	return lst
}
export const toUnicode = (str : string) => {
	const lst = Array.from(str).reverse()
	str = ''
	const len = lst.length
	for (let dex = 0; dex < len; dex++) {
		const letter = lst[dex]
		const hex = letter.codePointAt(0)!.toString(16)
		str += "0000".substring(0, 4 - hex.length) + hex
	}	
	return str	
}
export const reshape = <T>(original : Array<T>, size : number) : Array<T[]> => {
	const lst: T[][] = []
	while(original.length) lst.push(original.splice(0, size))
	const len = lst.length
	for (let dex = 0; dex < len; dex++) {
		original.push(...lst[dex])
	}
	return lst
}

// just a facade to make using the cache a bit easier 
export default new LRU({
	max: 750,

	// for use when you need to clean up something when objects
	// are evicted from the cache
	dispose: (value, key) => {
		
	},

	// how long to live in ms
	ttl: 1000 * 60 * 10, // -> 5 min

	// return stale items before removing from cache?
	allowStale: false,

	updateAgeOnGet: false,
	updateAgeOnHas: false,
})