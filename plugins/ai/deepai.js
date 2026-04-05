import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Mau tanya apa ke DeepAI?\nContoh: *${usedPrefix + command} Apa itu black hole?*`

    // 1. Kirim Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '🤖', key: m.key } })

    try {
        console.log(`[DeepAI] Mengirim pertanyaan: "${text}"`)

        // 2. Request ke API NVL Group (DeepAI)
        // KITA GUNAKAN STRATEGI YANG SAMA DENGAN PYTHON
        const { data } = await axios.get('https://ytdlpyton.nvlgroup.my.id/ai/deepai-chat', {
            params: { 
                prompt: text 
            },
            headers: {
                // Header Lengkap (Copy-Paste dari resep Python yang berhasil)
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                'Connection': 'keep-alive',     // Penting!
                'Referer': 'https://google.com', // Penting! Pura-pura dari Google
                'Origin': 'https://google.com'
            },
            timeout: 60000 // Timeout 60 detik (Server AI butuh waktu mikir)
        })

        // 3. Cek Response
        // Kadang API balikin status false tapi tetap ada message
        if (!data) throw new Error('Tidak ada respon dari server.')

        const answer = data.response || data.result || data.message || data.data || 'Maaf, AI tidak memberikan jawaban.'

        // 4. Kirim Jawaban
        await m.reply(answer)

        // 5. Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error('DeepAI Error:', e.message)
        // Reaksi Gagal
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        
        if (e.code === 'ETIMEDOUT') {
            m.reply('⏳ Server DeepAI macet/timeout (tidak merespon). Coba lagi nanti.')
        } else {
            m.reply('❌ Terjadi kesalahan pada server DeepAI.')
        }
    }
}

handler.help = ['deepai <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(deepai|deep)$/i
handler.limit = true

export default handler