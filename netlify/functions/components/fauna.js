import faunadb from 'faunadb'

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

const User = async (id) => await Get(Match(Index("by_id"), id))
const banned = async (key) => await Paginate(Match(Index("is_banned"), key))[0]

export const banreq = (id) => {
	return new Promise(async (res, rej) => {
		if (await banned(id)){
			client.query(
				Update(
					Call(fun('getRef'), id),
					{ data : 
						{ban_request : true}
					}
				)	
			).then(ret => res(true)	
			).catch(err => rej(err))
		} else res(false)
	})
}
export const newUser = async (id , data) => {
	return new Promise(async (res, rej) => {
		client.query(
			(typeof await User(id) == 'undefined')?
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
export const updateQuery = (index, key, data) => {
	return new Promise((res, rej) => {
		client.query(
			Update(
				Call(fun(index), key),
				{ data }
			)
		).then(ret => res(true)	
		).catch(err => rej(err))
		
	})
}
export const getQuery = (index, values ) => {
	return new Promise((res, rej) => {
		client.query(
			Get(
				Match(Index(index), values)
			)
		).then(ret => res(ret)	
		).catch(err => rej(err))
	})
}
export const pagiQuery = (index, ...values) => {
	return new Promise((res, rej) => {
		client.query(
				Paginate(
				  Match(Index(index), ...values)
				)
		).then(ret => res(ret.data)	
		).catch(err => rej(err))
	})
}