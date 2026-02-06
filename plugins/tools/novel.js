import axios from 'axios'
import { readMore } from '../../lib/func.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Mau cari novel apa? Contoh: *${usedPrefix + command} isekai*`

    // 1. Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '📚', key: m.key } })

    try {
        // 2. Request ke API Amira
        // Endpoint: /v1/novel/search
        const { data } = await axios.get(`${global.APIs.amira}/v1/novel/search`, {
            params: { query: text } 
        })

        // 3. Validasi Response
        if (!data.success || !data.data || !data.data.items || data.data.items.length === 0) {
            throw new Error('Novel tidak ditemukan.')
        }

        // Ambil maksimal 5 novel teratas
        const novels = data.data.items.slice(0, 5)

        // 4. Susun Pesan (Header Simple)
        let txt = `📚 *PENCARIAN NOVEL*\n🔍 Kata Kunci: ${text}\n\n`
        
        novels.forEach((v, i) => {
            txt += `${i + 1}. *${v.title}*\n`
            txt += `   ⭐ Score: ${v.score} | 📄 ${v.totalChapters} Ch\n`
            txt += `   👁️ View: ${v.totalViews}\n`
        })

        // 5. Tambahkan Readmore (Pemisah)
        txt += readMore

        // 6. Susun Pesan (Isi Detail & Sinopsis)
        txt += `\n📖 *SINOPSIS & DETAIL*\n`
        novels.forEach((v, i) => {
            txt += `\n*${i + 1}. ${v.title}*\n`
            txt += `🏷️ Genre: ${v.genres.join(', ')}\n`
            txt += `🏳️ Bahasa: ${v.language}\n`
            txt += `📌 Status: ${v.novelStatusDesc}\n`
            txt += `📝 Sinopsis:\n${v.summary.trim()}\n`
            txt += `──────────────────\n`
        })

        // 7. Kirim Pesan (Tanpa Quoted)
        // Thumbnail diambil dari novel urutan pertama
        await conn.sendMessage(m.chat, {
            text: txt,
            contextInfo: {
                externalAdReply: {
                    title: 'Chocomilk Novel Search',
                    body: `Menampilkan ${novels.length} hasil teratas`,
                    thumbnailUrl: novels[0].cover.url, 
                    sourceUrl: 'https://chocomilk.amira.us.kg',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }) 

        // Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        // Kirim pesan error tanpa quote juga (biar konsisten)
        conn.sendMessage(m.chat, { text: '❌ Novel tidak ditemukan atau server sedang sibuk.' })
    }
}

handler.help = ['novel <judul>']
handler.tags = ['tools']
handler.command = /^(novel|novelsearch)$/i

export default handler