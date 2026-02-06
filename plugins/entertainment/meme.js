import axios from 'axios'

// ==========================================
//  DAFTAR SUMBER MEME (API)
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
            // A. Request Data Meme
            const res = await axios.get(api.url, { timeout: 5000 })
            const data = res.data

            // Validasi response
            if (!data.url || data.nsfw) { 
                // Skip jika tidak ada URL atau konten NSFW
                continue 
            }

            // B. Susun Caption
            let caption = `*${data.title}*

👤 Author: ${data.author}
👍 Ups: ${data.ups}
🔗 Source: r/${data.subreddit}
`
            // C. Kirim Gambar
            await conn.sendMessage(m.chat, {
                image: { url: data.url },
                caption: caption,
                mentions: [m.sender]
            }, { quoted: m })

            success = true
            break // Berhasil? Stop loop.

        } catch (e) {
            console.error(`[RMEME] Error pada ${api.name}:`, e.message)
            lastError = e.message
            continue // Lanjut ke percobaan berikutnya
        }
    }

    // 3. Feedback Akhir
    if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal mengambil meme setelah 3x percobaan.\nInfo: ${lastError}`)
    }
}

handler.help = ['meme', 'rmeme']
handler.tags = ['fun', 'entertainment']
handler.command = /^(meme|rmeme)$/i
handler.limit = true

export default handler