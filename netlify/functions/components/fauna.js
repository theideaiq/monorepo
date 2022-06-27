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

export const newUser = async (name, username, id, signed_to_newsletter) => {
	return await newQuery('users', User, {
		id,
		name,
		username,
		banned : false,
		status : 'user',
		signed_to_newsletter,
		unban_request_message : ''
	})				
}
export const User = async (data) => await Get(Match(Index("get_username"), data.username))

export const newQuery = (Collection_name, cond, data) => {
	return new Promise((res, rej) => {
		if (cond(data)) 
			res(false);
		else {
			client.query(
				Create(
					Collection(Collection_name),
					{ data }
				)
			).then(ret => res(ret)	
			).catch(err => rej(err))
		}
	})
}
export const updateQuery = (index, key, cond, data) => {
	return new Promise((res, rej) => {
		if (cond(data)) res(false) 
		else {
			client.query(
				Update(
					Call(fun(index), key),
					{ data }
				)
			).then(ret => res(ret)	
			).catch(err => rej(err))
		}
	})
}

export const getQuery = (index, values) => {
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