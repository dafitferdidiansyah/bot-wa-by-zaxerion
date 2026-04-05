import axios from 'axios'
import { toAudio } from '../../lib/converter.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <link instagram>`
    if (!/instagram\.com/.test(text)) throw '❌ Link Instagram tidak valid!'

    // 1. Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '🎧', key: m.key } })

    try {
        // 2. Request Metadata
        const response = await axios.get(`${global.APIs.amira}/v1/download/instagram`, {
            params: { url: text },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 60000
        })

        const res = response.data
        if (!res.success || !res.data) throw new Error('Gagal mengambil data.')

        const data = res.data
        const allMedia = data.media?.all || (data.url ? [{ type: 'video', url: data.url }] : [])
        
        // Cari URL Audio dan Video
        const audioObj = allMedia.find(m => m.type === 'audio' || m.extension === 'm4a')
        const videoObj = allMedia.find(m => m.type === 'video' || m.extension === 'mp4')

        let buffer = null
        
        // SKENARIO 1: Coba download Audio Murni dulu
        if (audioObj) {
            try {
                console.log('[IG Audio] Mencoba download audio source...')
                const mediaRes = await axios.get(audioObj.url, { 
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 30000
                })
                buffer = mediaRes.data
            } catch (e) {
                console.log('[IG Audio] Gagal download audio source, beralih ke convert video.')
            }
        }

        // SKENARIO 2: Jika audio gagal atau tidak ada, download Video lalu Convert
        if (!buffer && videoObj) {
            console.log('[IG Audio] Download video untuk convert...')
            const vidRes = await axios.get(videoObj.url, { 
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 60000
            })
            
            // Convert Video -> Audio
            const audio = await toAudio(vidRes.data, 'mp4')
            buffer = audio.data
        }

        if (!buffer) throw new Error('Gagal mendownload media (Audio & Video error).')

        // 3. Kirim Audio
        await conn.sendMessage(m.chat, {
            audio: buffer,
            mimetype: 'audio/mpeg', 
            contextInfo: {
                externalAdReply: {
                    title: 'Instagram Audio',
                    body: data.author?.username || 'IG Music',
                    thumbnailUrl: data.author?.profilePicture || 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
                    sourceUrl: text,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error('[IG Audio Fatal Error]', e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Gagal mengambil audio.')
    }
}

handler.help = ['igaudio <url>', 'igmp3 <url>']
handler.tags = ['Menu Downloader']
handler.command = /^(igaudio|igmp3|instagramaudio|igmusic)$/i
handler.limit = true

export default handler