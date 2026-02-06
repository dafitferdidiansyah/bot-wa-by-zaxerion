import axios from 'axios'

// ==========================================
//  DAFTAR SERVER AI (Amira <-> Ryzumi)
// ==========================================
const apis = [
    // 1. Amira (Chocomilk) - Prioritas Utama
    {
        name: 'Amira',
        url: `${global.APIs.amira}/v1/llm/chatgpt/completions`,
        // FIX: Menggunakan 'ask' untuk pertanyaan, dan 'prompt' untuk persona
        params: (text, session) => ({ 
            ask: text,  // WAJIB: Pertanyaan dari user
            prompt: "Kamu adalah asisten AI yang cerdas, ramah, dan sangat membantu. Jawablah menggunakan bahasa Indonesia yang baik." // OPSIONAL: Identitas Bot
        }),
        parser: (data) => {
            // Struktur response: { data: { answer: "..." } }
            if (data.success && data.data && data.data.answer) {
                return data.data.answer
            }
            return null
        }
    },
    // 2. Ryzumi (Cadangan)
    {
        name: 'Ryzumi',
        url: `${global.APIs.ryzumi}/api/ai/chatgpt`,
        params: (text, session) => ({
            text: text,
            prompt: "Kamu adalah asisten AI yang cerdas dan membantu.",
            session: session
        }),
        parser: (data) => {
            if (data.success && data.result) {
                return data.result
            }
            return null
        }
    }
]

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Hai! Mau tanya apa ke ChatGPT?\n\nContoh:\n${usedPrefix + command} Buatkan resep nasi goreng`

    // 1. Kirim Reaksi & Status Mengetik
    await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })
    await conn.sendPresenceUpdate('composing', m.chat)

    const sessionID = m.sender.split('@')[0]
    let replyText = ''
    let success = false
    let lastError = ''

    // 2. Loop Mencoba Server
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i]
        try {
            console.log(`[AI] Mencoba server ${api.name}...`)

            // Request ke API dengan PENYAMARAN BROWSER LENGKAP
            // Headers ini penting untuk menghindari error 403 (Cloudflare Block)
            const response = await axios.get(api.url, {
                params: api.params(text, sessionID),
                timeout: 60000, // Timeout 60 detik (AI butuh waktu mikir)
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': 'https://google.com',
                    'Origin': 'https://google.com'
                }
            })

            // Parse hasil
            const result = api.parser(response.data)
            
            if (result) {
                replyText = result
                success = true
                console.log(`[AI] Sukses menggunakan server ${api.name}`)
                break // Berhasil, keluar loop
            } else {
                console.log(`[AI] Server ${api.name} merespon tapi format data salah/kosong.`)
                // Debug log untuk melihat isi data yang salah
                if (response.data) console.log(JSON.stringify(response.data))
            }
        } catch (e) {
            console.log(`Server AI ${api.name} gagal: ${e.message}`)
            // Jika ada response data error dari server, log juga
            if (e.response && e.response.data) {
                console.log('Error Data:', JSON.stringify(e.response.data))
            }
            lastError = e.message
            continue // Lanjut ke server berikutnya
        }
    }

    // 3. Kirim Balasan
    if (success) {
        await m.reply(replyText)
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply(`Maaf, semua server AI sedang sibuk atau error.\nInfo: ${lastError}`)
    }
}

handler.help = ['gpt <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(gpt|chatgpt|ai)$/i
handler.limit = true 

export default handler