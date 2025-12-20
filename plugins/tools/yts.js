import yts from 'yt-search'
import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Mau cari video apa? \nContoh: *${usedPrefix}${command} lagu galau*`

    // 1. Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    let results = []
    let source = ''

    // =========================================================
    // JALUR 1: Library yt-search (Utama)
    // =========================================================
    try {
        const search = await yts(text)
        if (search && search.all && search.all.length > 0) {
            results = search.all
            source = 'yt-search'
        }
    } catch (e) {
        console.log('[YTS] Library Error, mencoba backup Amira...', e.message)
    }

    // =========================================================
    // JALUR 2: API Amira (Cadangan)
    // =========================================================
    if (results.length === 0) {
        try {
            // Request ke Amira jika jalur 1 gagal
            const { data } = await axios.get(`${global.APIs.amira}/v1/youtube/search`, {
                params: { q: text } // Parameter pencarian
            })

            // Amira mengembalikan data di data.all (mirip struktur yt-search)
            if (data.success && data.data && data.data.all) {
                results = data.data.all
                source = 'Amira API'
            }
        } catch (e) {
            console.error('[YTS] Amira Error:', e.message)
        }
    }

    // Jika kedua jalur gagal
    if (results.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('❌ Maaf, video tidak ditemukan di semua server.')
    }

    // =========================================================
    // FORMAT TAMPILAN
    // =========================================================
    // Ambil maksimal 10 hasil teratas
    const limit = results.slice(0, 10)
    
    // Cari video pertama untuk thumbnail cover
    const firstVideo = limit.find(v => v.type === 'video') || limit[0]

    let txt = `🎬 *YOUTUBE SEARCH*\n`
    txt += `🔍 Query: _${text}_\n`
    txt += `📡 Source: ${source}\n\n`

    limit.forEach((v, i) => {
        // Handle perbedaan nama property sedikit (jaga-jaga)
        const duration = v.timestamp || v.duration?.timestamp || v.duration || '-'
        const views = v.views || '-'
        const author = v.author?.name || v.author || 'Unknown'
        
        txt += `*${i + 1}. ${v.title}*\n`
        txt += `   🕒 ${duration} | 👀 ${views}\n`
        txt += `   👤 ${author}\n`
        txt += `   📎 ${v.url}\n\n`
    })

    // Kirim Pesan dengan Thumbnail
    await conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
            externalAdReply: {
                title: firstVideo.title,
                body: `Youtube by ${source}`,
                thumbnailUrl: firstVideo.thumbnail || firstVideo.image || 'https://i.ibb.co/3zpXk1s/facebook-logo.png',
                sourceUrl: firstVideo.url,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })

    // Reaksi Sukses
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help = ['yts <judul>', 'ytsearch <judul>']
handler.tags = ['tools', 'internet']
handler.command = /^(ytsearch|yts)$/i

export default handler