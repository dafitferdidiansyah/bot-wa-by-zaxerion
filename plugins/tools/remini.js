import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    if (!mime) throw `Kirim/Balas gambar burik dengan caption *${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `Format tidak didukung! Kirim gambar jpg/png.`

    // 1. Reaksi Loading
    await conn.sendMessage(m.chat, { react: { text: '✨', key: m.key } })

    try {
        // 2. Download Gambar ke Memory (Buffer)
        let img = await q.download()
        
        // 3. Siapkan Data (Multipart Form Data)
        const formData = new FormData()
        formData.append('image', new Blob([img]), 'image.jpg')

        console.log(`[Upscale] Mengirim gambar ke server...`)

        // 4. Request ke API
        const { data } = await axios.post('https://ytdlpyton.nvlgroup.my.id/utility/upscale', formData, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 60000
        })

        // 5. Validasi Response (Perbaikan Logika)
        let finalUrl = null

        // Cek jika response berupa Object { "result_url": "..." }
        if (data && typeof data === 'object' && data.result_url) {
            finalUrl = data.result_url
        } 
        // Cek jika response langsung String URL
        else if (typeof data === 'string' && data.startsWith('http')) {
            finalUrl = data
        }

        if (!finalUrl) {
            console.log('[Upscale Debug]', data) // Print data asli kalo error
            throw new Error('Respon server bukan URL gambar valid.')
        }

        console.log(`[Upscale] Sukses: ${finalUrl}`)

        // 6. Kirim Hasil
        await conn.sendMessage(m.chat, {
            image: { url: finalUrl },
            caption: `✨ *UPSCALE SUKSES*`
        }, { quoted: m })
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error('[Upscale Error]', e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        
        let errMsg = e.message
        if (e.response && e.response.status === 422) errMsg = 'Gambar tidak valid atau rusak.'
        if (e.code === 'ECONNABORTED') errMsg = 'Proses terlalu lama (Timeout).'
        
        m.reply(`Gagal menjernihkan gambar.\nInfo: ${errMsg}`)
    }
}

handler.help = ['remini', 'upscale', 'hd']
handler.tags = ['tools']
handler.command = /^(remini|hd|enhance|upscale)$/i
handler.limit = true

export default handler