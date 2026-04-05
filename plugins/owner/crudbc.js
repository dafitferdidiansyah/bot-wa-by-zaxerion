import db from '../../lib/database.js';

let handler = async (m, { conn, command, args }) => {
    // Inisialisasi database khusus list BC jika belum ada
    if (!db.data.bclist) db.data.bclist = [];

    // --- FITUR MELIHAT DAFTAR BROADCAST ---
    if (command === 'listbc') {
        if (db.data.bclist.length === 0) {
            return m.reply('📜 *Daftar Broadcast masih kosong.*\n\nKetik *.addbc 628xxx* untuk menambahkan nomor target.');
        }
        
        let txt = `📜 *DAFTAR NOMOR BROADCAST*\nTotal: ${db.data.bclist.length} nomor\n\n`;
        db.data.bclist.forEach((num, i) => {
            txt += `${i + 1}. ${num.split('@')[0]}\n`;
        });
        txt += `\n_Ketik .delbc <nomor> untuk menghapus dari daftar._`;
        return m.reply(txt);
    }

    // --- FITUR MENAMBAHKAN NOMOR KE DAFTAR ---
    if (command === 'addbc') {
        let num = args[0];
        if (!num) return m.reply('Masukkan nomornya!\nContoh: *.addbc 628123456789*');
        
        // Membersihkan input (buang spasi/strip) dan ubah ke ID WA
        num = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (db.data.bclist.includes(num)) {
            return m.reply('❌ Nomor tersebut sudah ada di daftar Broadcast!');
        }

        db.data.bclist.push(num);
        return m.reply(`✅ Berhasil menambahkan *${num.split('@')[0]}* ke daftar Broadcast.`);
    }

    // --- FITUR MENGHAPUS NOMOR DARI DAFTAR ---
    if (command === 'delbc') {
        let num = args[0];
        if (!num) return m.reply('Masukkan nomor yang mau dihapus!\nContoh: *.delbc 628123456789*');
        
        num = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        let index = db.data.bclist.indexOf(num);
        if (index === -1) {
            return m.reply('❌ Nomor tersebut tidak ditemukan di daftar! Cek list dengan *.listbc*');
        }

        db.data.bclist.splice(index, 1);
        return m.reply(`🗑️ Berhasil menghapus *${num.split('@')[0]}* dari daftar Broadcast.`);
    }
}

handler.help = ['addbc', 'delbc', 'listbc'];
handler.tags = ['owner'];
// 1 file ini akan menangani 3 command sekaligus
handler.command = /^(addbc|delbc|listbc)$/i; 
handler.owner = true;

export default handler;