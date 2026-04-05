import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Contoh: ${usedPrefix + command} halo dunia`

    // 1. Reaksi Loading (Emoji Pena)
    await conn.sendMessage(m.chat, { react: { text: '📝', key: m.key } })

    try {
        // 2. Request ke API
        const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/topegon`, {
            params: { text: text },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://google.com'
            },
            timeout: 100000 // Timeout 10 detik
        })

        if (!data.pegon) throw new Error('Gagal konversi.')

        // 3. Kirim Hasil Langsung
        await m.reply(data.pegon)
        
        // Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Gagal.')
    }
}

handler.help = ['topegon <teks>']
handler.tags = ['tools']
handler.command = /^(topegon|pegon)$/i

export default handler