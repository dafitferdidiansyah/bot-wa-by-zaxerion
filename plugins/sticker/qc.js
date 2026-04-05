import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import fs from 'fs'

const handler = async (m, { conn, args, usedPrefix, command }) => {
    let text
    if (args.length >= 1) {
        text = args.slice(0).join(" ");
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else throw "Mana teksnya?"
    
    if (!text) return m.reply('Mana teksnya?')

    try {
        // --- FIX: Tambahkan deteksi pengirim pesan yang di-quote (m.quoted.sender) ---
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.fromMe ? conn.user.jid : m.sender;
        
        const mentionRegex = new RegExp(`@${who.split('@')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
        const orang = text.replace(mentionRegex, '');
        
        // --- BONUS: Ambil Foto Profil WA asli milik temanmu ---
        let pp;
        try {
            pp = await conn.profilePictureUrl(who, 'image');
        } catch (e) {
            // Jika dia menyembunyikan foto profilnya, pakai foto default
            pp = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
        }

        const number = await conn.getName(who)
        
        const obj = { 
            "type": "quote", 
            "format": "png", 
            "backgroundColor": "#000000", 
            "width": 1024, 
            "height": 1024, 
            "scale": 2, 
            "messages": [{ 
                "entities": [], 
                "avatar": true, 
                "from": { 
                    "id": 1, 
                    "name": `${number}`, 
                    "photo": { url: `${pp}` } 
                }, 
                "text": orang, 
                "replyMessage": {} 
            }] 
        };
        
        const json = await axios.post('https://bot.lyo.su/quote/generate', obj, { headers: { 'Content-Type': 'application/json' } });
        const buffer = Buffer.from(json.data.result.image, 'base64');
        
        // Pastikan variabel packname dan author terdeteksi secara global
        let sticker = new Sticker(buffer, { 
            pack: global.packname || 'Bot Sticker', 
            author: global.author || 'QC Generator', 
            type: StickerTypes.FULL 
        });
        
        let ztick = await sticker.toBuffer()
        if (sticker) return conn.sendFile(m.chat, ztick, 'qc.webp', '', m);
        
    } catch (e) {
        console.log(e)
        await m.reply("Terjadi error saat membuat quote!")
    }
}

handler.help = ['qc']
handler.tags = ['Menu Sticker']
handler.command = /^(qc)$/i

export default handler