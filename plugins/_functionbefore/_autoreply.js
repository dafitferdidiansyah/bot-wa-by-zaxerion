import { ranNumb } from '../../lib/func.js'
import db from '../../lib/database.js'
import axios from 'axios'

// Konfigurasi API dan Persona
const API_URL = global.APIs.amira + '/v1/llm/chatgpt/completions'

// SYSTEM PROMPT BARU: Sebagai Asisten AFK Netral
const SYSTEM_PROMPT = (userName) => {
    return `Kamu adalah Asisten Pribadi Otomatis dari ${userName}. Tugasmu adalah merespons semua pesan dengan sopan dan informatif. Beri tahu pengirim bahwa pengguna (pemilik akun) sedang tidak aktif, jauh dari ponsel, atau sedang sibuk. Jangan pernah menjawab pertanyaan untuk pengguna, cukup konfirmasikan bahwa pesan telah diterima dan pengguna akan membalas secepatnya. Jawab dengan singkat, profesional, dan ramah.`
}
const MIN_CHARS_FOR_AI = 20 // Minimal panjang pesan untuk memicu mode AI

// ================= KONFIGURASI =================

// Mode: 'TARGET' (Hanya nomor tertentu) atau 'ALL' (Semua orang di PC)
const mode = 'TARGET' 

// Masukkan nomor target (Hanya dipakai jika mode = 'TARGET')
const targetNumbers = [
    '6285736570874', // Nomor doi kamu
    // Tambahkan nomormu sendiri di sini
]

// ===============================================

export async function before(m) {
    // 1. CEK KONDISI WAJIB
    if (m.isGroup || m.fromMe || db.data.users[m.sender]?.banned || !m.text) return !1

    const senderNumber = m.sender.split('@')[0]
    // Cek Mode Target
    if (mode === 'TARGET' && !targetNumbers.includes(senderNumber)) return !1
    
    // Ambil nama pemilik akun untuk personalisasi prompt
    const ownerName = await this.getName(this.user.jid) || 'Pengguna'
    const systemPromptFinal = SYSTEM_PROMPT(ownerName)

    const text = m.text.toLowerCase().trim()
    
    // Cek apakah pesan adalah sapaan singkat atau panggilan (Gunakan Fixed Reply)
    const isShortCall = text.length < MIN_CHARS_FOR_AI || /^(p|bot|halo|hai|mum|mom|mami|sayang|ayang|cinta|hai)/i.test(text)
    
    // Cek apakah user sedang AFK (jika AFK, jangan balas)
    if (db.data.users[m.sender]?.afk > 0) return !1


    // --- 1. LOGIKA JAWAB CEPAT (Fixed AFK message) ---
    // Diprioritaskan untuk sapaan/pesan pendek
    if (isShortCall) {
        const jawaban = afkList.getRandom()
        await this.sendPresenceUpdate('composing', m.chat)
        await sleep(ranNumb(500, 1500)) 
        await this.reply(m.chat, jawaban, m)
        return !0
    }

    // --- 2. LOGIKA JAWAB CERDAS (AI Mode) ---
    // Jika pertanyaan panjang atau butuh konteks
    try {
        await this.sendPresenceUpdate('composing', m.chat)

        // Memanggil AI untuk MENGHASILKAN PESAN AFK yang dinamis
        const response = await axios.get(API_URL, {
            params: { 
                // Kita instruksikan AI untuk membuat pesan AFK, menyertakan pesan user di dalamnya
                ask: `Pesan user: "${m.text}". ${systemPromptFinal} Jawab sekarang.`, 
                prompt: systemPromptFinal // Untuk memperkuat persona
            },
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        })
        
        const res = response.data
        let aiResponse = res.data?.answer || res.answer
        
        if (aiResponse) {
            await this.sendPresenceUpdate('composing', m.chat)
            await this.reply(m.chat, aiResponse, m)
            return !0 // Sukses dijawab AI
        }
        
    } catch (e) {
        console.error("Autoreply AI Failed:", e.message)
    }

    // --- 3. FALLBACK: Gunakan jawaban fixed AFK jika semua gagal ---
    const jawaban = afkList.getRandom()
    await this.sendPresenceUpdate('composing', m.chat)
    await sleep(ranNumb(500, 1000))
    await this.reply(m.chat, jawaban, m)
    
    return !0
}

// Fungsi delay kecil
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// --- DATABASE JAWABAN FIXED AFK (Pengganti Bucin List) ---
const afkList = [
    'Halo. Pengguna saat ini sedang tidak aktif. Pesan Anda sudah diterima, nanti akan dibalas.',
    'Mohon tunggu sebentar. Pemilik akun sedang jauh dari ponsel.',
    'Pesan ini sudah diterima. Pengguna akan membalas Anda secepatnya. Terima kasih.',
    'Maaf, sedang tidak bisa membalas chat. Silakan tinggalkan pesan.'
]