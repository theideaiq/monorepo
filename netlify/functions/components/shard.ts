import { Markup } from 'telegraf'
<<<<<<< HEAD
import {newUser, user} from "@components/fauna"
=======
import {user} from "@components/fauna"
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
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
	const lst : T[][] = [[],[]], len = array.length
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
	const lst: T[][] = [], copy = [...original]
	while(copy.length) lst.push(copy.splice(0, size))
	return lst
}

<<<<<<< HEAD
// just a facade to make using the cache a bit easier 
export const cache =  new LRU({
	max: 100,

	// for use when you need to clean up something when objects
	// are evicted from the cache
	// todo does not get called when stale items are auto purged
	dispose (value : user, key : number) {
		const {username, status, id} = value
		return newUser(key, {
			id,
			status,
			username,
			banned: false,
		})
	},

	// how long to live in ms
	ttl: 1000 * 60 * 30, // -> 30 min
	ttlResolution : 2,
	ttlAutopurge : true,
	updateAgeOnGet: true,
	updateAgeOnHas: true,
=======

class lru extends LRU<number ,user> {
	update (key : number, updated : {}) {
		const original = this.peek(key)
		if (original === undefined) throw TypeError("cache object does not exist")		
		this.set(key,
			{...original, ...updated}
		)
	}
}

export const cache =  new lru({
	max: 150,

	// how long to live in ms
	ttl: 1000 * 60 * 15, // -> 15 min
	ttlResolution : 2,
	allowStale: true,
	updateAgeOnGet: true,
	updateAgeOnHas: true,

>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
})

export const Secache = new LRU({
	max: 100,

<<<<<<< HEAD
	// for use when you need to clean up something when objects
	// are evicted from the cache
=======
	// using it to auto set the type checking 
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
	dispose (value : string[], key : string) {},

	// how long to live in ms
	ttl: 1000 * 60 * 10, // -> 10 min
	ttlResolution : 2,
	// return stale items before removing from cache?
	allowStale:true,
	updateAgeOnGet: true,
	updateAgeOnHas: true,
<<<<<<< HEAD
})
=======
})

>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
