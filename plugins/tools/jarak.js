import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let [dari, ke] = text.split('|')
    if (!dari || !ke) throw `Format: ${usedPrefix + command} Asal | Tujuan`

    // Reaksi Loading (biar user tau bot bekerja)
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
        // Request ke API (Headers tetap WAJIB ada biar ga diblokir server)
        const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/jarak`, {
            params: { dari: dari.trim(), ke: ke.trim() },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://google.com'
            },
            timeout: 10000
        })

        if (!data.jarak_km) throw new Error('Data tidak ditemukan')

        // Output Simple: Hanya teks singkat
        const hasil = `📏 *${data.jarak_km}*\n( ${data.dari} ➡️ ${data.ke} )`
        
        await m.reply(hasil)

    } catch (e) {
        m.reply('Gagal. Pastikan nama kota benar.')
    }
}

handler.help = ['jarak <asal> | <tujuan>']
handler.tags = ['tools']
handler.command = /^(jarak|distance)$/i

export default handler