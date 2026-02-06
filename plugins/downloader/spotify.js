import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

// ==========================================
//  DAFTAR SERVER SPOTIFY (Amira AIO -> Amira Direct)
// ==========================================
const apis = [
    // 1. Amira AIO (Prioritas Utama - Data Lengkap)
    {
        name: 'Amira AIO',
        url: (link) => `${global.APIs.amira}/v1/download/aio?url=${encodeURIComponent(link)}`,
        timeout: 60000,
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.medias) {
                // Cari file tipe audio/mp3 dari array medias
                const media = res.data.medias.find(v => v.type === 'audio' || v.extension === 'mp3')
                
                if (media) {
                    return {
                        url: media.url,
                        title: res.data.title || 'Spotify Track',
                        artist: res.data.author || 'Spotify Artist',
                        thumbnail: res.data.thumbnail || 'https://i.ibb.co/3zpXk1s/facebook-logo.png',
                        filename: `${res.data.title}.mp3`
                    }
                }
            }
            return null
        }
    },
    // 2. Amira Direct (Cadangan)
    {
        name: 'Amira Direct',
        url: (link) => `${global.APIs.amira}/v1/download/spotify?url=${encodeURIComponent(link)}`,
        timeout: 60000,
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.media) {
                return {
                    url: res.data.media.url,
                    title: res.data.title || 'Spotify Track',
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
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <judul lagu / link spotify>\nContoh: *${usedPrefix}${command} mangu*`
    
    let urlToDownload = text
    
    // ========================================================
    // 1. CEK APAKAH INPUT ADALAH QUERY (BUKAN LINK)
    // ========================================================
    if (!/open\.spotify\.com|spotify\.link/i.test(text)) {
        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
        
        try {
            console.log(`[Spotify Search] Mencari: ${text}`)
            // Request ke API NVL Group
            const searchRes = await axios.get('https://ytdlpyton.nvlgroup.my.id/spotify/search', {
                params: { query: text },
                headers: { 
                    'accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })

            if (searchRes.data && searchRes.data.results && searchRes.data.results.length > 0) {
                const result = searchRes.data.results[0] // Ambil hasil pertama
                urlToDownload = result.spotify_url
                console.log(`[Spotify Search] Ditemukan: ${urlToDownload}`)
            } else {
                throw new Error('Lagu tidak ditemukan di pencarian.')
            }
        } catch (e) {
            console.error(e)
            return m.reply('❌ Gagal mencari lagu. Pastikan judul benar atau gunakan link langsung.')
        }
    }

    // ========================================================
    // 2. PROSES DOWNLOAD (Menggunakan URL hasil search/input)
    // ========================================================
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
    await conn.sendPresenceUpdate('recording', m.chat)

    let success = false
    let lastError = ''

    // Loop Server Downloader
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i]
        try {
            // A. Request Metadata ke Amira
            const response = await axios.get(api.url(urlToDownload), {
                timeout: api.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })

            const data = api.parser(response)
            if (!data || !data.url) continue 

            // B. Download File Audio
            const safeTitle = data.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
            const tmpDir = path.join(process.cwd(), 'tmp')
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
            const filePath = path.join(tmpDir, `${safeTitle}.mp3`)

            const audioResponse = await axios({
                method: 'GET',
                url: data.url,
                responseType: 'stream',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                }
            })

            await streamPipeline(audioResponse.data, fs.createWriteStream(filePath))

            // C. Kirim ke WA
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
            console.log(`Spotify ${api.name} gagal: ${e.message}`)
            lastError = e.message
            continue
        }
    }

    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal download Spotify. Semua server sibuk.\nInfo: ${lastError}`)
    }
}

handler.help = ['spotify <judul/link>']
handler.tags = ['Menu Downloader']
handler.command = /^(spotify|sp|spot)$/i
handler.limit = true

export default handler