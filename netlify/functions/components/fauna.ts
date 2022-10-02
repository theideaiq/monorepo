import faunadb from "faunadb";
import { user, schema } from "@components/elpers";

if (process.env.FAUNA_KEY === undefined) throw TypeError("faunadb key is needed ");
const client = new faunadb.Client({
	secret: process.env.FAUNA_KEY,
	domain: "db.eu.fauna.com",
	scheme: "https",
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
	Update,
	Call,
	Function: func,
} = faunadb.query;

export const banreq = async (id: number, data: object): Promise<boolean> => {
	const doc = await client.query<string | object>(
		Let(
			{
				match: Match(Index("by_id"), id),
				exist: Exists(Var("match")),
				doc: If(Var("exist"), Get(Var("match")), false),
			},
			If(
				And(Var("exist"), Select(["data", "banned"], Var("doc"))),
				Create(Collection("requests"), {
					data: {
						...data,
						type: "ban request",
					},
				}),
				"nothing",
			),
		),
	);

	if (doc === "nothing") return false;
	return true;
};
export const newUser = (id: number, data: object) => {
	return client.query<schema<user>>(
		Let(
			{
				match: Match(Index("by_id"), id),
				exist: Exists(Var("match")),
			},
			If(
				Var("exist"),
				Update(Call(func("getRef"), Var("match")), {
					data: {
						signed_to_newsletter: true,
					},
				}),
				Create(Collection("users"), { data }),
			),
		),
	);
};
export const userWCache = (id: number, data: user) => {
	return client.query<schema<user>>(
		Let(
			{
				match: Match(Index("by_id"), id),
				exist: Exists(Var("match")),
			},
			If(
				Var("exist"),
				Update(Call(func("getRef"), Var("match")), {
					data: {
						banned: data.banned,
						status: data.status,
					},
				}),
				Create(Collection("users"), {
					data: {
						...data,
						signed_to_newsletter: false,
					},
				}),
			),
		),
	);
};
export const updateUser = (id: number, data: object) => {
	return client.query<schema<user>>(
		Let(
			{
				match: Match(Index("by_id"), id),
				exist: Exists(Var("match")),
			},
			If(Var("exist"), Update(Call(func("getRef"), Var("match")), { data }), false),
		),
	);
};
export const pagiQuery = <schem>(index: string, ...values: Array<string | number | boolean>) => {
	return client.query<schem[]>(Select("data", Paginate(Match(Index(index), ...values))));
};
