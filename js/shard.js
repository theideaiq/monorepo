import {readFile, writeFile, readdir} from 'node:fs/promises'
// import {readFileSync} from 'node:fs'
// helper funcions for core
const json = async () => {
	const obj = {}
	for (let path of await readdir('json')) 
		obj[path.slice(0, path.indexOf('.') -1)] = await readFile("json/" + path)
	return obj;
}
const makeImage = (stats) => {
	// for the polls
}

export {
	json,
	makeImage
}