import faunadb from 'faunadb' 

if (process.env.FAUNA_KEY === undefined) throw TypeError("faunadb key is needed ")
const client = new faunadb.Client({ 
	secret: process.env.FAUNA_KEY ,
	domain: "db.eu.fauna.com",
	scheme: 'https',
});

const {
	And,
	Var,
	Let,
	Select,
	If,
	Exists,
	Paginate,
	Get,
	Match,
	Index,
	Create,
	Collection,
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
					{ data : {
							ban_request : message
						}
					}
				),
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
		)
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


  
export interface user  {
	chat_id?: number
	id: number,
	last?: string,
	messages?: number[]
	status?: string,
	banned?: boolean,
	username?: string,
	count?: number,
	ban_request?: string,
	signed_to_newsletter?: boolean,
}
type schema<schem> = {
	ref: faunadb.Expr,
	ts: number,
	data: schem
  }