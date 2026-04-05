import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Gunakan format: ${usedPrefix}${command} <nama mahasiswa/dosen>\nContoh: *${usedPrefix}${command} Joko Widodo*`

    // 1. Reaksi Loading (Style Play: Kaca Pembesar)
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    try {
        // 2. Request ke API NVL
        // Endpoint sesuai dokumentasi user
        const { data } = await axios.get(`https://ytdlpyton.nvlgroup.my.id/pddikti?q=${encodeURIComponent(text)}`)

        // 3. Parsing Data
        // API mengembalikan object { mahasiswa: [...], dosen: [...] }
        let resultText = ''
        let hasResults = false

        // --- Cek Data Mahasiswa ---
        if (data.mahasiswa && data.mahasiswa.length > 0) {
            hasResults = true
            resultText += `🎓 *MAHASISWA* (Top 10)\n`
            // Limit 10 hasil agar tidak spam
            data.mahasiswa.slice(0, 3).forEach((v, i) => {
                resultText += `\n${i + 1}. *${v.nama}*\n`
                resultText += `   🏫 ${v.nama_pt} (${v.sinkatan_pt || '-'}) - ${v.nama_prodi}\n`
                resultText += `   🔢 NIM: ${v.nim}\n`
            })
            resultText += `\n` 
        }

        // --- Cek Data Dosen (Opsional, jika API mengembalikan dosen) ---
        if (data.dosen && data.dosen.length > 0) {
            hasResults = true
            resultText += `👨‍🏫 *DOSEN* (Top 5)\n`
            data.dosen.slice(0, 5).forEach((v, i) => {
                resultText += `\n${i + 1}. *${v.nama}*\n`
                resultText += `   🏫 ${v.nama_pt} (${v.sinkatan_pt || '-'}) - ${v.nama_prodi}\n`
                resultText += `   🔢 NIDN: ${v.nidn || '-'}\n`
            })
        }

        // Jika tidak ada hasil sama sekali
        if (!hasResults) {
            throw new Error('Data tidak ditemukan.')
        }

        // 4. Kirim Pesan (Style Play: External Ad Reply)
        await conn.sendMessage(m.chat, {
            text: `📁 *HASIL PENCARIAN PDDIKTI*\n🔍 Kata Kunci: _${text}_\n\n${resultText}`,
            contextInfo: {
                externalAdReply: {
                    title: 'PDDIKTI Database',
                    body: 'Kementerian Pendidikan dan Kebudayaan',
                    thumbnailUrl: 'https://pddikti.kemdikbud.go.id/asset/gambar/logopddikti.png', 
                    sourceUrl: 'https://pddikti.kemdikbud.go.id',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

        // 5. Reaksi Sukses
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        // Reaksi Gagal
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Maaf, data tidak ditemukan atau server sedang sibuk.')
    }
}

handler.help = ['dikti <nama>']
handler.tags = ['tools']
// Command pendek sesuai request
handler.command = /^(dikti|pddikti|mhs|mahasiswa)$/i

export default handler