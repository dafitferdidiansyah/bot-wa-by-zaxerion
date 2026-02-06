import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

const apis = [
    {
        name: 'Amira',
        url: (link) => `${global.APIs.amira}/v1/download/aio?url=${encodeURIComponent(link)}`,
        timeout: 600000, 
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.medias) {
                const vid = res.data.medias.find(v => v.quality === 'hd_no_watermark') || 
                            res.data.medias.find(v => v.quality === 'no_watermark') ||
                            res.data.medias.find(v => v.type === 'video')
                
                if (vid) {
                    return {
                        url: vid.url,
                        title: res.data.title || 'TikTok Video'
                    }
                }
            }
            return null
        }
    },
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/ttdl?url=${encodeURIComponent(link)}`,
        timeout: 150000,
        parser: (response) => {
            const data = response.data
            if (!data.success && data.data?.code !== 0) return null
            const res = data.data?.data
            if (!res) return null

            return {
                url: res.play, 
                title: res.title || 'TikTok Video'
            }
        }
    }
]

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Linknya mana?`
    if (!/tiktok\.com/i.test(text)) throw '❌ Link TikTok tidak valid!'

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
                    'Referer': 'https://google.com'
                }
            })

            const data = api.parser(response)
            if (!data || !data.url) continue 

            const safeTitle = `tt_${Date.now()}`
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
                    'Referer': 'https://tiktok.com' // Kadang butuh referer tiktok
                }
            })

            await streamPipeline(videoResponse.data, fs.createWriteStream(filePath))

            // 2. Kirim Video Simple
            await conn.sendMessage(m.chat, {
                video: { url: filePath },
                fileName: `${safeTitle}.mp4`,
                mimetype: 'video/mp4',
                caption: data.title
            }, { quoted: m })

            fs.unlink(filePath, (err) => {})
            success = true
            break 

        } catch (e) {
            console.log(`TT ${api.name} gagal: ${e.message}`)
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

handler.help = ['tiktok <url>']
handler.tags = ['Menu Downloader']
handler.command = /^(tiktok|tt|ttdl|vt)$/i
handler.limit = true

export default handler