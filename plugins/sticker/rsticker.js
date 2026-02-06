import { sticker } from '../../lib/sticker.js'
import axios from 'axios'

// ==========================================
//  DAFTAR SUMBER MEME UNTUK STIKER
// ==========================================
const sources = [
    {
        name: 'Reddit Meme',
        url: 'https://meme-api.com/gimme/meme',
    },
    {
        name: 'Reddit DankMemes',
        url: 'https://meme-api.com/gimme/dankmemes',
    },
    {
        name: 'Reddit Indonesia',
        url: 'https://meme-api.com/gimme/indonesia',
    },
    {
        name: 'Reddit Wholesome',
        url: 'https://meme-api.com/gimme/wholesomememes',
    },
    {
        name: 'Reddit ProgrammerHumor',
        url: 'https://meme-api.com/gimme/ProgrammerHumor',
    },
    {
        name: 'Reddit Cats',
        url: 'https://meme-api.com/gimme/cats',
    }
]

let handler = async (m, { conn, usedPrefix, command }) => {
    // 1. Reaksi Awal
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    let success = false
    let lastError = ''

    // 2. Loop Percobaan (Maksimal 3x coba)
    for (let i = 0; i < 3; i++) {
        // Pilih salah satu source secara acak
        const api = sources[Math.floor(Math.random() * sources.length)]
        
        try {
            // A. Request Data Meme (JSON)
            const res = await axios.get(api.url, { timeout: 5000 })
            const data = res.data

            // Validasi response: Pastikan ada URL gambar dan bukan NSFW
            // Kita skip NSFW agar bot aman dan skip GIF agar proses konversi stiker cepat
            if (!data.url || data.nsfw || data.url.endsWith('.gif')) { 
                continue 
            }

            // B. Download Gambar Meme menjadi Buffer
            const imageRes = await axios.get(data.url, { 
                responseType: 'arraybuffer',
                timeout: 10000
            })
            const buffer = Buffer.from(imageRes.data)

            // C. Konversi Gambar ke Stiker
            // Menggunakan fungsi sticker() dari lib/sticker.js
            // Packname: Judul Meme, Author: Subreddit
            let stiker = await sticker(buffer, false, data.title.substring(0, 30), `r/${data.subreddit}`)

            if (stiker) {
                // D. Kirim Stiker ke User
                await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m)
                success = true
                break // Berhasil? Stop loop.
            } else {
                lastError = 'Gagal konversi ke stiker.'
                continue
            }

        } catch (e) {
            console.error(`[RSTICKER] Error pada ${api.name}:`, e.message)
            lastError = e.message
            continue // Lanjut ke percobaan berikutnya
        }
    }

    // 3. Feedback Akhir
    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal membuat stiker meme setelah 3x percobaan.\nInfo: ${lastError}`)
    }
}

handler.help = ['rsticker', 'sticker-random']
handler.tags = ['fun', 'sticker']
handler.command = /^(rsticker|randomsticker|stikerra?ndom)$/i
handler.limit = true

export default handler