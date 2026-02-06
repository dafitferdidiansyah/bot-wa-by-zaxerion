import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Kode Baru (Sesuai struktur baru)
// Arahkan ke folder lib/games/database/
const jsonPath = path.join(__dirname, '../../lib/games/database/tebakkata.json')
let tebakkata = JSON.parse(fs.readFileSync(jsonPath))

const motivasiPath = path.join(__dirname, '../../lib/games/database/katamotivasi.json')
let listMotivasi = JSON.parse(fs.readFileSync(motivasiPath))

const timeout = 60000 // 60 detik

let handler = async (m, { conn, command, usedPrefix }) => {
    conn.tebakkata = conn.tebakkata ? conn.tebakkata : {}
    let id = m.chat

    if (id in conn.tebakkata) {
        conn.reply(m.chat, 'Masih ada soal yang belum terjawab di chat ini', conn.tebakkata[id][0])
        throw false
    }

    let json = tebakkata[Math.floor(Math.random() * tebakkata.length)]
    
    let caption = `
🎮 *TEBAK KATA* 🎮

Petunjuk: *${json.petunjuk}*

Waktu: *${timeout / 1000} detik*
Hadiah: *Kata Mutiara Spesial* 📜

Balas pesan ini untuk menjawab!
    `.trim()

    conn.tebakkata[id] = [
        await conn.reply(m.chat, caption, m),
        json,
        setTimeout(() => {
            if (conn.tebakkata[id]) {
                conn.reply(m.chat, `Waktu habis!\nJawabannya adalah: *${json.jawaban}*`, conn.tebakkata[id][0])
                delete conn.tebakkata[id]
            }
        }, timeout)
    ]
}

handler.help = ['tebakkata']
handler.tags = ['Menu Fun']
handler.command = /^tebakkata/i

// --- LOGIKA JAWABAN (DIPERBAIKI) ---

// Kita buat fungsi before terpisah dulu
const before = async (m, { conn }) => {
    conn.tebakkata = conn.tebakkata ? conn.tebakkata : {}
    let id = m.chat

    // 1. Cek apakah ada game berjalan di chat ini?
    if (!conn.tebakkata[id]) return 

    // 2. PENTING: Cek apakah pesan ada isinya (Text)?
    // Kalau user kirim stiker/audio, m.text biasanya undefined/null, ini bikin crash.
    if (!m.text) return

    let json = conn.tebakkata[id][1]
    
    // 3. Normalisasi Jawaban (Trim & Lowercase)
    // .trim() membuang spasi di depan/belakang biar akurat
    if (m.text.toLowerCase().trim() === json.jawaban.toLowerCase().trim()) {
        
        // Ambil satu motivasi acak
        let hadiahMotivasi = listMotivasi[Math.floor(Math.random() * listMotivasi.length)]

        await conn.reply(m.chat, `✅ *BENAR!* Jawabannya: ${json.jawaban}\n\n🎁 *Hadiah Untukmu:*\n_"${hadiahMotivasi}"_`, m)
        
        // Hapus timer dan data game
        clearTimeout(conn.tebakkata[id][2])
        delete conn.tebakkata[id]
    } 
}

// Tempelkan fungsi before ke handler (Untuk kompatibilitas base lama)
handler.before = before

// Export default handler
export default handler

// Export const before (Untuk kompatibilitas base baru)
export { before }