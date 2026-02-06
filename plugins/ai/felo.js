import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Contoh: ${usedPrefix + command} Siapa penemu lampu?`

    // 1. Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })

    try {
        // 2. Request API (Headers Wajib ada biar ga diblokir)
        const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/ai/felo`, {
            params: { text },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://google.com'
            },
            timeout: 60000 
        })

        if (!data.answer) throw new Error('Tidak ada jawaban.')

        // 3. Format Pesan (Jawaban + List Sumber)
        let caption = `🤖 *Felo AI*\n\n${data.answer}`
        
        if (data.sources && data.sources.length > 0) {
            caption += `\n\n🔗 *Sumber:*\n`
            data.sources.forEach((s, i) => {
                const url = s.link || s.url || s
                const title = s.title || `Sumber ${i+1}`
                caption += `- ${title}: ${url}\n`
            })
        }

        // 4. Kirim (Gambar atau Teks)
        let imageUrl = null

        // Cek apakah ada gambar
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            const firstImg = data.images[0]
            // FIX: Cek apakah gambar berupa Object atau String URL
            if (typeof firstImg === 'string') {
                imageUrl = firstImg
            } else if (typeof firstImg === 'object' && firstImg.url) {
                imageUrl = firstImg.url
            }
        }

        if (imageUrl) {
            await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption }, { quoted: m })
        } else {
            await m.reply(caption)
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Maaf, terjadi kesalahan.')
    }
}

handler.help = ['felo <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(felo|feloai)$/i
handler.limit = true

export default handler