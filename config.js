import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import Helper from './lib/helper.js'
import "dotenv/config";

global.nomorown = '6285187269581'
global.mods = ['6285187269581']
global.nomorbot = 'xxxxx'
// Di file config.js
global.GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

global.db = Helper.opts['dev'] ? '' : 'MONGODB_URL'

global.APIs = {
	zax: 'https://kinda-apis.vercel.app',
	ryzumi:'https://api.ryzumi.vip',
	lolhuman:'https://lolhuman.xyz',
	fasturl:'https://api.fasturl.link',
	nvlgroup:'https://ytdlpyton.nvlgroup.my.id',
	ammaricano:'https://api.ammaricano.my.id',
	siputzx:'https://api.siputzx.my.id',
	amira:'https://chocomilk.amira.us.kg',
}

global.APIKeys = {
	'https://kinda-apis.vercel.app': '',
	'https://api.ryzumi.vip': '',
	'https://lolhuman.xyz': 'ab3a0476e395cd716a209f35',
	'https://api.fasturl.link':'',
	'https://ytdlpyton.nvlgroup.my.id':'',
	'https://api.ammaricano.my.id':'',
	'https://api.siputzx.my.id':'',
	'https://chocomilk.amira.us.kg':'',

}

global.wait = '```Loading...```'
global.eror = '```404 error```'
global.self = true //pengaturan private atau publik

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
	unwatchFile(file)
	console.log(chalk.redBright("Update 'config.js'"))
	import(`${file}?update=${Date.now()}`)
})
