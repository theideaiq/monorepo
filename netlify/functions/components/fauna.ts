import faunadb from 'faunadb' 

if (process.env.FAUNA_KEY === undefined) throw TypeError("faunadb key is needed ")

const client = new faunadb.Client({ 
	secret: process.env.FAUNA_KEY ,
	domain: "db.eu.fauna.com",
	scheme: 'https',
});

const {
	Paginate,
	Get,
	Match,
	Index,
	Create,
	Collection,
	Update,
	Call,
	Functions : fun
} = faunadb.query

export const banreq = (id : number) : Promise<boolean>=> {
	return new Promise(async (res, rej) => {
			client.query(
				Update(
					Call(fun('getRef'), id),
					{ data : 
						{ban_request : 'true'}
					}
				)	
			).then(ret => res(true)	
			).catch(err => rej(err))
	})
}
export const newUser = (id : number , data : user) : Promise<{}>  => {
	return new Promise((res, rej) => {
		client.query(
			(Get(Match(Index("by_id"), id)) === undefined)?
				Update(
					Call(fun('getRef'), id),
					{ data : data.signed_to_newsletter  }
				):
				Create(
					Create(
						Collection('users'),
						{ data }
					)
				)
		).then(ret => res(ret)	
		).catch(err => rej(err))
	})
}
export const getQuery = <schem>(index : string , values : string) : Promise<schema<schem>> => {
	return new Promise((res, rej) => {
		client.query<schema<schem>>(
			Get(
				Match(Index(index), values)
			)
		).then(ret => res(ret)	
		).catch(err => rej(err))
	})
}
export const pagiQuery = <T>(index : string, ...values : string[]) : Promise<T>  => {
	return new Promise((res, rej) => {
		client.query<{data:T}>(
				Paginate(
				  Match(Index(index), ...values)
				)
		).then((ret) => res(ret.data)	
		).catch(err => rej(err))
	})
} 
export interface user {
	chat_id?: number
	id: number,
	last?: string,
	messages?: number[]
	status?: string,
	banned: boolean,
	username?: string,
	samecount?: number,
	ban_request: string,
	signed_to_newsletter: boolean
}
type schema<schem> = {
	ref: faunadb.Expr,
	ts: number,
	data: schem
  }