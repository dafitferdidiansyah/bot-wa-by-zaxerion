import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

// ==========================================
//  DAFTAR SERVER INSTAGRAM
// ==========================================
const apis = [
    {
        name: 'Amira',
        url: (link) => `${global.APIs.amira}/v1/download/instagram?url=${encodeURIComponent(link)}`,
        parser: (data) => {
            if (data.success && data.data) {
                // Ambil semua media (Video & Gambar)
                const allMedia = data.data.media?.all || []
                
                // Jika kosong, coba cek single url di data.data.url
                if (allMedia.length === 0 && data.data.url) {
                    allMedia.push({ url: data.data.url, type: 'video' })
                }

                // FILTER PENTING: Hanya ambil Video & Image (Abaikan Audio/M4A)
                // Ini mencegah error fetch failed karena link audio kadang bermasalah
                const validMedia = allMedia.filter(m => m.type === 'video' || m.type === 'image')

                return {
                    media: validMedia,
                    caption: data.data.title || 'Instagram Post'
                }
            }
            return null
        }
    },
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/igdl?url=${encodeURIComponent(link)}`,
        parser: (data) => {
            if (data.success && data.data) {
                return { 
                    media: data.data, 
                    caption: 'Instagram Post' 
                }
            }
            return null
        }
    }
]

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <link instagram>`
    if (!/instagram\.com/.test(text)) throw '❌ Link Instagram tidak valid!'

    await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } })

    let success = false
    let lastError = ''

    for (let i = 0; i < apis.length; i++) {
        const api = apis[i]
        try {
            // A. Request Metadata
            const response = await axios.get(api.url(text), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                timeout: 30000
            })

            const result = api.parser(response.data)
            
            // Jika tidak ada media valid (misal isinya cuma audio semua), skip
            if (!result || !result.media || result.media.length === 0) continue 

            // B. Download & Kirim Setiap Media
            for (let j = 0; j < result.media.length; j++) {
                const item = result.media[j]
                const url = item.url || item 
                
                // Deteksi tipe file
                const isVideo = url.includes('.mp4') || (item.type === 'video') || (item.extension === 'mp4')
                const ext = isVideo ? 'mp4' : 'jpg'
                
                // Streaming Download (Stabil)
                const safeTitle = `ig_${Date.now()}_${j}`
                const tmpDir = path.join(process.cwd(), 'tmp')
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
                const filePath = path.join(tmpDir, `${safeTitle}.${ext}`)

                const mediaResponse = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                })

                await streamPipeline(mediaResponse.data, fs.createWriteStream(filePath))

                // C. Kirim ke WhatsApp
                // Caption hanya di media pertama
                const msgCaption = j === 0 ? result.caption : ''

                if (isVideo) {
                    await conn.sendMessage(m.chat, { 
                        video: { url: filePath }, 
                        caption: msgCaption 
                    }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, { 
                        image: { url: filePath }, 
                        caption: msgCaption 
                    }, { quoted: m })
                }

                // Hapus file tmp
                fs.unlink(filePath, (err) => {})
            }

            success = true
            break // Sukses, berhenti loop server

        } catch (e) {
            console.log(`[IGDL] Error ${api.name}: ${e.message}`)
            lastError = e.message
        }
    }

    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal download Instagram. Coba lagi nanti.\nInfo: ${lastError}`)
    }
}

handler.help = ['instagram <url>', 'ig <url>']
handler.tags = ['Menu Downloader']
handler.command = /^(instagram|ig|igdl|reels)$/i
handler.limit = true

export default handler