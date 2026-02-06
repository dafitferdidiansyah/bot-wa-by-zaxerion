import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <url>\nContoh: *${usedPrefix}${command} https://google.com*`

    // 1. Validasi URL sederhana
    if (!/^https?:\/\//.test(text)) throw '❌ URL harus diawali dengan http:// atau https://'

    // 2. Reaksi Loading (Emoji Rantai)
    await conn.sendMessage(m.chat, { react: { text: '🔗', key: m.key } })

    try {
        // 3. Request ke API NVL
        const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/shorturl?url=${encodeURIComponent(text)}`)

        // 4. Cek hasil response
        if (!data || !data.shortened) {
            throw new Error('Gagal memendekkan URL.')
        }

        // 5. Kirim Pesan Hasil
        let txt = `✅ *SHORTLINK BERHASIL*\n\n`
        txt += `📂 *Original:* ${data.original}\n`
        txt += `🚀 *Shortened:* ${data.shortened}\n`
        txt += `🔑 *Code:* ${data.code}`

        await m.reply(txt)

        // 6. Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        // Reaksi Gagal
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Maaf, terjadi kesalahan saat memendekkan URL atau server sedang sibuk.')
    }
}

handler.help = ['shorturl <url>']
handler.tags = ['tools']
handler.command = /^(short(url|link)?)$/i

export default handler