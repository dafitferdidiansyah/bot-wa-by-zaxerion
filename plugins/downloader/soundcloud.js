import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

// ==========================================
//  DAFTAR SERVER (Khusus Amira)
// ==========================================
const apis = [
    {
        name: 'Amira',
        url: (link) => `${global.APIs.amira}/v1/download/soundcloud?url=${encodeURIComponent(link)}`,
        timeout: 60000, // Timeout 60 detik
        parser: (response) => {
            const res = response.data
            // Parsing sesuai struktur JSON terbaru Amira
            if (res.success && res.data && res.data.media) {
                return {
                    url: res.data.media.url,
                    title: res.data.title || 'SoundCloud Track',
                    artist: res.data.artist || 'Unknown Artist',
                    thumbnail: res.data.cover || 'https://i.ibb.co/3zpXk1s/facebook-logo.png',
                    filename: res.data.media.filename || 'music.mp3'
                }
            }
            return null
        }
    }
]

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <link soundcloud>\nContoh: ${usedPrefix}${command} https://soundcloud.com/artist/song`
    
    // Validasi Link SoundCloud
    if (!/soundcloud\.com|snd\.sc/i.test(text)) throw '❌ Link SoundCloud tidak valid!'

    // Reaksi Loading (Emoji Awan/Musik)
    await conn.sendMessage(m.chat, { react: { text: '☁️', key: m.key } })
    await conn.sendPresenceUpdate('recording', m.chat)

    let success = false
    let lastError = ''

    // Loop Server
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i]
        try {
            // A. Request Metadata & Link
            const response = await axios.get(api.url(text), {
                timeout: api.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })

            const data = api.parser(response)
            if (!data || !data.url) continue 

            // B. Download Audio Stream
            const safeTitle = data.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
            const tmpDir = path.join(process.cwd(), 'tmp')
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
            const filePath = path.join(tmpDir, `${safeTitle}.mp3`)

            const audioResponse = await axios({
                method: 'GET',
                url: data.url,
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })

            await streamPipeline(audioResponse.data, fs.createWriteStream(filePath))

            // C. Kirim ke WhatsApp
            await conn.sendMessage(m.chat, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                fileName: data.filename,
            }, { quoted: m })

            // Cleanup
            fs.unlink(filePath, (err) => {})
            success = true
            break 

        } catch (e) {
            console.log(`SoundCloud ${api.name} gagal: ${e.message}`)
            lastError = e.message
            continue
        }
    }

    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal download SoundCloud. Server sibuk/error.\nInfo: ${lastError}`)
    }
}

handler.help = ['soundcloud <url>', 'scdl <url>']
handler.tags = ['Menu Downloader']
handler.command = /^(soundcloud|scdl|sc)$/i
handler.limit = true

export default handler