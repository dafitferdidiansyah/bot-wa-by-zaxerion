import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <query/link>\n\nContoh Search:\n*${usedPrefix}${command} anime dark*\n\nContoh Download:\n*${usedPrefix}${command} https://id.pinterest.com/pin/12345678/*`

    // 1. Reaksi Loading (Kaca Pembesar)
    await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } })

    // Cek apakah input berupa Link atau Query
    const isUrl = /pinterest\.com|pin\.it/i.test(text)
    
    // Config Request (Headers Chrome agar tidak diblokir server)
    const axiosConfig = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://google.com'
        },
        timeout: 20000 // 20 detik timeout
    }

    try {
        let imageUrl = ''
        let caption = ''

        if (isUrl) {
            // ==========================================
            // MODE DOWNLOAD (JIKA LINK)
            // ==========================================
            console.log(`[Pinterest] Downloading URL: ${text}`)
            
            const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/pinterest/download`, {
                ...axiosConfig,
                params: { url: text }
            })

            // Ambil gambar resolusi tertinggi (biasanya yang terakhir di array atau yang original)
            if (data.media && data.media.length > 0) {
                // Cari yang original atau ambil index terakhir
                const bestMedia = data.media.find(v => v.url.includes('originals')) || data.media[data.media.length - 1]
                imageUrl = bestMedia.url
                
                // Prioritaskan title, jika kosong pakai description
                let titleText = data.title || 'No Title'
                let descText = data.description || ''
                if (titleText === 'No Title' && descText) titleText = descText;

                caption = `📌 *PINTEREST DOWNLOAD*\n📝 ${titleText}`
            } else {
                throw new Error('Media tidak ditemukan dalam link tersebut.')
            }

        } else {
            // ==========================================
            // MODE SEARCH (JIKA QUERY)
            // ==========================================
            console.log(`[Pinterest] Searching: ${text}`)
            
            // Ambil 20 hasil biar variatif
            const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/pinterest/search`, {
                ...axiosConfig,
                params: { query: text, limit: 20 }
            })

            if (data.results && data.results.length > 0) {
                // Pilih 1 gambar secara acak dari hasil pencarian
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)]
                
                // Ambil url image original
                imageUrl = randomResult.media.images.orig.url
                
                // LOGIKA BARU UNTUK CAPTION (Fix Title Issue)
                // Kita ambil title dulu. Kalau kosong, baru ambil description.
                let displayTitle = randomResult.title || randomResult.description || 'Image'
                // Bersihkan spasi berlebih
                displayTitle = displayTitle.trim()
                if (!displayTitle) displayTitle = 'Image'

                caption = `🔍 *PINTEREST SEARCH*\n📝 Query: ${text}\n📌 Title: ${displayTitle}`
            } else {
                throw new Error('Gambar tidak ditemukan.')
            }
        }

        // 2. Kirim Gambar ke WhatsApp
        await conn.sendMessage(m.chat, {
            image: { url: imageUrl },
            caption: caption
        }, { quoted: m })

        // 3. Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error('[Pinterest Error]', e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Gagal memproses permintaan.\nInfo: ${e.message || e}`)
    }
}

handler.help = ['pinterest <query/link>', 'pin <query/link>']
handler.tags = ['tools', 'downloader']
handler.command = /^(pinterest|pin|pindl)$/i
handler.limit = true

export default handler