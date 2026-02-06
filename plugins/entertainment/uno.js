import Uno from '../../lib/games/engine/uno.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    conn.uno = conn.uno ? conn.uno : {}
    let id = m.chat

    if (!(id in conn.uno)) conn.uno[id] = new Uno()
    let game = conn.uno[id]

    switch (args[0]) {
        case 'join':
            if (game.status == 'PLAYING') return m.reply('Game sudah dimulai, tidak bisa join.')
            if (game.addPlayer(m.sender, m.pushName)) {
                m.reply(`Berhasil join! Total pemain: ${game.players.length}`)
            } else {
                m.reply('Kamu sudah join.')
            }
            break

        case 'start':
            if (game.status == 'PLAYING') return m.reply('Game sudah berjalan.')
            if (game.start()) {
                let txt = `🎮 *UNO GAME STARTED* 🎮\n\n`
                txt += `Giliran: @${game.players[game.turn].id.split('@')[0]}\n`
                txt += `Kartu Top: ${game.discard[game.discard.length-1].color} ${game.discard[game.discard.length-1].value}\n\n`
                txt += `*Cara Main:*\nKetik *kartu* untuk melihat kartu.\nKetik *play [urutan]* untuk main.\nContoh: *play 1*`
                
                conn.reply(m.chat, txt, m, { mentions: [game.players[game.turn].id] })
            } else {
                m.reply('Pemain kurang (Min 2).')
            }
            break
            
        case 'leave':
            game.removePlayer(m.sender)
            m.reply('Kamu keluar dari game.')
            if (game.players.length == 0) delete conn.uno[id]
            break

        case 'delete':
            delete conn.uno[id]
            m.reply('Sesi UNO dihapus.')
            break

        default:
            m.reply(`
🔰 *UNO GAME MENU* 🔰

${usedPrefix}uno join
${usedPrefix}uno start
${usedPrefix}uno leave
${usedPrefix}uno delete
            `.trim())
    }
}

handler.help = ['uno']
handler.tags = ['Menu Fun']
handler.command = /^(uno)$/i

export default handler