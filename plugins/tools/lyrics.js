import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Mau cari lirik lagu apa? Contoh: *${usedPrefix + command} mangu*`

    // 1. Reaksi Loading (Emoji Kertas/Pena)
    await conn.sendMessage(m.chat, { react: { text: '📝', key: m.key } })

    try {
        // 2. Request ke API Amira
        // Endpoint: /v1/search/lyrics
        const { data } = await axios.get(`${global.APIs.amira}/v1/search/lyrics`, {
            params: { query: text }
        })

        // 3. Validasi Response
        // Cek apakah sukses dan ada datanya
        if (!data.success || !data.data) {
            throw new Error('Lirik tidak ditemukan.')
        }

        const info = data.data
        
        // 4. Susun Format Lirik
        // Lirik dari API berupa Array ["baris1", "baris2"], kita gabung jadi string dengan enter (\n)
        const lyricsText = Array.isArray(info.lyrics) ? info.lyrics.join('\n') : info.lyrics

        let caption = `🎵 *LIRIK LAGU* 🎵\n\n`
        caption += `📜 *Judul:* ${info.title}\n`
        caption += `🎤 *Artis:* ${info.artist}\n`
        caption += `💿 *Album:* ${info.album || '-'}\n`
        caption += `⏳ *Durasi:* ${info.duration || '-'} detik\n\n`
        caption += `──────────────────\n\n`
        caption += lyricsText
        caption += `\n\n──────────────────`

        // 5. Kirim Pesan
        await conn.sendMessage(m.chat, {
            text: caption,
            contextInfo: {
                externalAdReply: {
                    title: `Lirik: ${info.title}`,
                    body: info.artist,
                    thumbnailUrl: 'https://i.ibb.co/3zpXk1s/facebook-logo.png', // Default icon karena API lirik biasanya ga bawa cover
                    sourceUrl: 'https://chocomilk.amira.us.kg',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

        // 6. Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('❌ Maaf, lirik tidak ditemukan atau server sedang sibuk.')
    }
}

handler.help = ['lirik <judul>']
handler.tags = ['tools']
handler.command = /^(lirik|lyrics|lyric)$/i

export default handler