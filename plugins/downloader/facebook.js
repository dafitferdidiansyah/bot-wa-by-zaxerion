import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

const apis = [
    {
        name: 'Amira',
        url: (link) => `${global.APIs.amira}/v1/download/facebook?url=${encodeURIComponent(link)}`,
        timeout: 20000, 
        parser: (response) => {
            const res = response.data
            if (res.success && res.data) {
                if (res.data.video) {
                    return {
                        url: res.data.video,
                        title: res.data.title || ''
                    }
                }
                if (Array.isArray(res.data)) {
                    const video = res.data.find(v => v.quality === 'hd') || res.data[0]
                    return {
                        url: video.url || video.download,
                        title: ''
                    }
                }
            }
            return null
        }
    },
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/fbdl?url=${encodeURIComponent(link)}`,
        timeout: 10000,
        parser: (response) => {
            const data = response.data
            if (!data.url && !data.result?.url) return null
            return {
                url: data.url || data.result?.url,
                title: ''
            }
        }
    }
]

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Linknya mana?`
    const fbRegex = /facebook|fb\.watch|fb\.com|facebook\.com|fb\.gg|share/i
    if (!fbRegex.test(text)) throw '❌ Link Facebook tidak valid!'

    // 1. Reaksi Proses
    await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } })

    let success = false
    let lastError = ''

    for (let i = 0; i < apis.length; i++) {
        const api = apis[i]
        try {
            const response = await axios.get(api.url(text), {
                timeout: api.timeout,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://facebook.com'
                }
            })
            
            const data = api.parser(response)
            if (!data || !data.url) continue 

            const safeTitle = `fb_${Date.now()}`
            const tmpDir = path.join(process.cwd(), 'tmp')
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
            const filePath = path.join(tmpDir, `${safeTitle}.mp4`)

            // Download dengan Penyamaran
            const videoResponse = await axios({
                method: 'GET',
                url: data.url,
                responseType: 'stream',
                timeout: 60000,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': 'https://facebook.com'
                }
            })

            await streamPipeline(videoResponse.data, fs.createWriteStream(filePath))

            // 2. Kirim Video Simple
            await conn.sendMessage(m.chat, {
                video: { url: filePath },
                fileName: `${safeTitle}.mp4`,
                mimetype: 'video/mp4',
                caption: data.title // Judul Saja
            }, { quoted: m })

            fs.unlink(filePath, (err) => {})
            success = true
            break 

        } catch (e) {
            console.log(`FB ${api.name} gagal: ${e.message}`)
            lastError = e.message
            continue
        }
    }

    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal.`)
    }
}

handler.help = ['facebook <url>', 'fb <url>']
handler.tags = ['Menu Downloader']
handler.command = /^(facebook|fb|fbdl)$/i
handler.limit = true

export default handler