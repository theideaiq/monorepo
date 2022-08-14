import faunadb from 'faunadb' 

if (process.env.FAUNA_KEY === undefined) throw TypeError("faunadb key is needed ")
<<<<<<< HEAD

=======
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
const client = new faunadb.Client({ 
	secret: process.env.FAUNA_KEY ,
	domain: "db.eu.fauna.com",
	scheme: 'https',
});

const {
	And,
<<<<<<< HEAD
=======
	Var,
	Let,
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
	Select,
	If,
	Exists,
	Paginate,
	Get,
	Match,
	Index,
	Create,
	Collection,
<<<<<<< HEAD
	Update,
	Call,
	Function : fun
} = faunadb.query

export const banreq = (id : number, message : string) : Promise<boolean>=> {
	return new Promise(async (res, rej) => {
		client.query(
			If ( Exists(Call(fun('getRef'), id)) && Select(["data", 0], Paginate(Match(Index("is_banned"), id))),
				Update(
					Call(fun('getRef'), id),
=======
	Update
} = faunadb.query

export const banreq = (id : number, message : string) : Promise<boolean> => {
	return new Promise(async (res, rej) => {
		client.query(
			Let(
				{
					match: Match(Index("by_id"), id),
					exist : Exists(Var("match")),
					doc : If (
						Var("exist"), Get(Var("match")), false
					)
				},
			If (And(Var("exist"), Select(['data','banned'], Var("doc"))),
				Update(
					Select("ref", Var("doc")),
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
					{ data : {
							ban_request : message
						}
					}
				),
<<<<<<< HEAD
			"nothing"
			)
		).then(ret => {
			// @ts-ignore
			if (res === "nothing") return res(false)
			return res(true)
		}
		
		).catch(err => rej(err))
	})
}
export const newUser = (id : number , data : user)  => {
	let ref 
	client.query(
		If ( Exists(ref = Call(fun('getRef'), id)),
		Update(
			ref,
			{ data : {
					signed_to_newsletter: true,
				}  
			}
		),
			Create(
				Collection('users'),
				{ data }
			)
		)
	)
}
export const userWCache = (id : number , data : user) => {
	client.query(
		If ( Exists(Call(fun('getRef'), id)),
			"nothing",
=======
				"nothing"
			)
			)
		).then(ret => {
			// @ts-ignore 
			if (ret === "nothing") return res(false)
			return res(true)
		}
		).catch(err => rej(err))
	})
}
export const newUser = async (id : number , data : {})  => {
	try {
		await client.query(
			Let(
				{
					match: Match(Index("by_id"), id),
					exist : Exists(Var("match")),
					doc : If (
						Var("exist"), Get(Var("match")), false
					)
				},
			If ( Var("exist"),
			Update(
				Select("ref",Var("doc")),
				{ data : {
						signed_to_newsletter: true,
					}  
				}
			),
				Create(
					Collection('users'),
					{ data }
				)
			)
			)
		)
	} catch (er) {console.error(er)}
}
export const userWCache = (id : number , data : user) => {
	client.query(
		Let(
			{
				match: Match(Index("by_id"), id),
				exist : Exists(Var("match")),
				doc : If (
					Var("exist"), Get(Var("match")), false
				)
			},
		If ( Var("exist"),
			Update( Select('ref', Var("doc")),
				{ data : {
					banned: false,
					status : data.status
				} }
			),
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
			Create(
				Collection('users'),
				{ data : {
					...data,
					banned: false,
					signed_to_newsletter: false,
					}
				}
			)
		)
<<<<<<< HEAD
=======
		)
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
	)
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
export const pagiQuery = <T>(index : string, ...values : string[]) : Promise<T[]>  => {
	return new Promise((res, rej) => {
		client.query<T[]>(
			Select('data' , Paginate(
				Match(Index(index), ...values)
			))
		).then((ret) => res(ret)
		).catch(err => rej(err))
	})
} 
<<<<<<< HEAD
export interface user {
=======


  
export interface user  {
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
	chat_id?: number
	id: number,
	last?: string,
	messages?: number[]
	status?: string,
	banned?: boolean,
	username?: string,
	count?: number,
	ban_request?: string,
<<<<<<< HEAD
	signed_to_newsletter?: boolean
=======
	signed_to_newsletter?: boolean,
>>>>>>> 95bf1ca6b58964bbff179e34339bda3913c3efcd
}
type schema<schem> = {
	ref: faunadb.Expr,
	ts: number,
	data: schem
  }