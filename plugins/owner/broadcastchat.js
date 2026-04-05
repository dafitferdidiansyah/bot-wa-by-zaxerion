import db from '../../lib/database.js';

let handler = async (m, { conn, text }) => {
    // Pastikan database bclist sudah siap
    if (!db.data.bclist) db.data.bclist = [];
    
    // Ambil target chat HANYA dari list yang sudah kita buat (CRUD)
    let chats = db.data.bclist;
    
    if (chats.length === 0) {
        return m.reply('❌ Daftar Broadcast masih kosong!\n\nSilakan tambahkan nomor target dulu menggunakan perintah:\n*.addbc 628xxx*');
    }
    
    if (!text) {
        return m.reply(`*Masukkan pesan yang ingin disiarkan!*\n\nContoh: .bcpc Halo teman-teman, ini pesan otomatis!`);
    }

    m.reply(`⏳ *Sedang menyiapkan siaran ke ${chats.length} nomor terdaftar...*\n\n_Catatan: Bot akan memberi jeda 2-3 detik antar pesan agar nomor aman dari pemblokiran._`);
    
    let successList = [];
    let failedList = [];
    
    // Looping kirim pesan
    for (let id of chats) {
        try {
            // Jeda aman anti-banned (2 detik)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Eksekusi kirim pesan
            await conn.sendMessage(id, { 
                text: `*「 BROADCAST KHUSUS 」*\n\n${text}` 
            });
            
            successList.push(id.split('@')[0]);
        } catch (e) {
            failedList.push(id.split('@')[0]);
        }
    }
    
    // --- MEMBUAT TEKS LAPORAN (REPORT) ---
    let report = `✅ *Siaran (Broadcast) Selesai!*\n\n`;
    
    report += `🟢 *Berhasil Terkirim: ${successList.length} orang*\n`;
    if (successList.length > 0) {
        let displaySuccess = successList.length > 50 ? successList.slice(0, 50).join(', ') + ' ...' : successList.join(', ');
        report += `_Detail: ${displaySuccess}_\n`;
    }
    
    report += `\n🔴 *Gagal Terkirim: ${failedList.length} orang*\n`;
    if (failedList.length > 0) {
        let displayFailed = failedList.length > 50 ? failedList.slice(0, 50).join(', ') + ' ...' : failedList.join(', ');
        report += `_Detail: ${displayFailed}_\n`;
    }
    
    // Kirim laporan ke owner
    m.reply(report);
}

handler.help = ['bcpc <teks>'];
handler.tags = ['owner'];
handler.command = /^(broadcastchat|bcchat|bcpc)$/i;
handler.owner = true;

export default handler;