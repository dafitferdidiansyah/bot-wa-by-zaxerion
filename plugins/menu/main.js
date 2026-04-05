import db from '../../lib/database.js'
import { plugins } from '../../lib/plugins.js'
import { readMore } from '../../lib/func.js'
import axios from 'axios' // Kita pakai axios agar lebih stabil

// --- KONFIGURASI KATEGORI MENU (Tetap Pertahankan Tag Anda) ---
let tags = {
    'main': 'MENU UTAMA',
    'ai': 'FITUR AI',
    'aikinda': 'AI CHAT',
    'Menu Downloader': 'DOWNLOADER',
    'fun': 'HIBURAN & GAME',
    'gacha': 'GACHA',
    'group': 'FITUR GROUP',
    'Menu Group': 'FITUR GROUP',
    'admin': 'ADMIN GROUP',
    'sticker': 'STICKER & KREATOR',
    'tools': 'ALAT BANTU (TOOLS)',
    'information': 'INFORMASI',
    'info': 'INFORMASI',
    'owner': 'KHUSUS OWNER',
    'ownerr': 'CREATOR',
    'submenu': 'SUB MENU',
}

const defaultMenu = {
    before: `
Hi *%name*
╭─「 *USER INFO* 」
│ 👤 *Name:* %name
│ 🏷️ *Tag:* @%nomor
╰──────────────

%readmore`.trim(),
    header: '╭─「 *%category* 」',
    body: '│ • %cmd',
    footer: '╰────\n',
}

let handler = async (m, { conn, usedPrefix: _p }) => {
    try {
        // --- 1. DOWNLOAD THUMBNAIL SESUAI LOGIKA ORIGINAL ---
        // Menggunakan API global "zax" seperti di referensi
        // Kita gunakan axios pengganti fetch agar kompatibel dengan dependency bot
        let thumbnailBuffer, imageId;
        
        try {
            const url = global.API("zax", "/api/etc/thumbnail", { type: 'large' }, "apikey");
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            
            thumbnailBuffer = Buffer.from(res.data);
            imageId = res.headers["x-image-id"]; // Ambil header ID gambar
            
            // Simpan ke global agar cache (opsional, mengikuti gaya ori)
            global.thumbnail = thumbnailBuffer;
            global.imageId = imageId;
        } catch (e) {
            console.log("Gagal fetch thumbnail dari API Zax, menggunakan fallback.");
            // Fallback jika API mati/limit
            thumbnailBuffer = await axios.get('https://telegra.ph/file/ef4b742d47e6a9115e2ff.jpg', { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data)).catch(() => null);
            imageId = 'default';
        }

        // --- 2. PERSIAPAN DATA USER ---
        let name = await conn.getName(m.sender).replaceAll('\n', '')
        let nomor = m.sender.split('@')[0]
        let user = db.data.users[m.sender] || {}

        // --- 3. FILTER & SUSUN MENU ---
        let help = Object.values(plugins).filter(plugin => !plugin.disabled).map(plugin => {
            return {
                help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
                tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
                prefix: 'customPrefix' in plugin,
                enabled: !plugin.disabled,
            }
        })

        // Susun teks menu
        let menuText = [
            defaultMenu.before,
            ...Object.keys(tags).map(tag => {
                let cmds = []
                for (let plugin of help) {
                    if (plugin.tags && plugin.tags.includes(tag) && plugin.help) {
                        for (let h of plugin.help) {
                            if (h) cmds.push({
                                text: h,
                                prefix: plugin.prefix
                            })
                        }
                    }
                }

                if (cmds.length === 0) return ''

                const bodyLines = cmds
                    .sort((a, b) => a.text.localeCompare(b.text))
                    .map(cmd => {
                        let c = cmd.prefix ? cmd.text : _p + cmd.text
                        return defaultMenu.body.replace(/%cmd/g, c)
                    })
                    .join('\n')

                return defaultMenu.header.replace(/%category/g, tags[tag]) + '\n' + 
                       bodyLines + '\n' + 
                       defaultMenu.footer
            })
        ].join('\n')

        // Replace variable
        let replace = {
            '%': '%',
            p: _p,
            me: conn.user.name || 'Bot',
            name, 
            nomor,
            limit: user.limit || 0,
            readmore: readMore
        }

        let text = menuText.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])

        // Tambahan Text List (Sesuai Referensi)
        let txtList = ``

        // --- 4. KIRIM DENGAN RELAY MESSAGE (INTI SOLUSI) ---
        // Menggunakan relayMessage + externalAdReply renderLargerThumbnail: true
        if (thumbnailBuffer) {
            conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: txtList + text.trim(),
                    contextInfo: {
                        mentionedJid: [m.sender],
                        externalAdReply: {
                            title: 'Hello ' + name,
                            body: global.wish || 'Kinda Bot',
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true, // INI KUNCINYA AGAR GAMBAR BESAR
                            thumbnail: thumbnailBuffer,
                            thumbnailUrl: `https://kinda.icu/redir/${imageId}`, // Trik agar WA mau render
                            sourceUrl: 'https://whatsapp.com/channel/0029VagxpVB6hENrC5nZ6K1k'
                        }
                    }, 
                    mentions: [m.sender]
                }
            }, { quoted: m }); // Gunakan 'm' sebagai quoted agar aman jika fkontak tidak ada
        } else {
            // Fallback jika gambar benar-benar gagal total
            m.reply(txtList + text.trim());
        }

    } catch (e) {
        console.error(e)
        m.reply('Terjadi kesalahan saat memuat menu.\n' + e)
    }
}

handler.help = ['menu', 'help']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i

export default handler