export async function before(m) {
    this.uno = this.uno ? this.uno : {}
    let id = m.chat
    if (!(id in this.uno)) return

    let game = this.uno[id]
    if (game.status !== 'PLAYING') return

    // 1. Cek Kartu Sendiri
    if (m.text.toLowerCase() === 'kartu') {
        let player = game.players.find(p => p.id === m.sender)
        if (!player) return
        
        let txt = `🃏 *KARTU KAMU* 🃏\n\n`
        player.hand.forEach((card, i) => {
            txt += `${i+1}. ${card.color} ${card.value}\n`
        })
        
        // Info Tambahan Kartu Top
        let top = game.discard[game.discard.length-1]
        txt += `\nTop Deck: ${top.color} ${top.value}`
        
        m.reply(txt)
        return
    }

    // 2. Play Kartu (Format: play 1 / play 1 merah)
    if (m.text.toLowerCase().startsWith('play ')) {
        let args = m.text.split(' ')
        let index = parseInt(args[1]) - 1
        let wildColor = null
        
        // Deteksi warna untuk kartu Wild
        if (args[2]) {
            if (['merah','red'].includes(args[2].toLowerCase())) wildColor = '🟥'
            if (['kuning','yellow'].includes(args[2].toLowerCase())) wildColor = '🟨'
            if (['hijau','green'].includes(args[2].toLowerCase())) wildColor = '🟩'
            if (['biru','blue'].includes(args[2].toLowerCase())) wildColor = '🟦'
        }

        let player = game.players.find(p => p.id === m.sender)
        let card = player?.hand[index]
        let top = game.discard[game.discard.length-1]

        let result = game.playCard(m.sender, index, wildColor)

        if (result === 'NOT_TURN') return m.reply('⏳ Bukan giliranmu! Tunggu giliran.')
        if (result === 'INVALID_CARD') return m.reply('❌ Kartu tidak ditemukan! Cek lagi dengan ketik *kartu*.')
        if (result === 'NEED_COLOR') return m.reply('🎨 Kartu ini butuh warna! Ketik: *play [urutan] [warna]*\nContoh: *play 1 merah*')
        
        if (result === 'INVALID_MOVE') {
            return m.reply(`❌ *KARTU TIDAK COCOK!*\n\nKartu Top: ${top.color} ${top.value}\nKartu Kamu: ${card.color} ${card.value}\n\nAturan:\n- Warna harus sama\n- Angka/Simbol harus sama\n- Atau gunakan kartu Wild (⚫)`)
        }
        
        // Jika menang
        if (result === 'WIN') {
            m.reply(`🎉 *SELAMAT!* 🎉\n@${m.sender.split('@')[0]} Memenangkan permainan UNO!`, null, { mentions: [m.sender] })
            delete this.uno[id]
            return
        }

        // Info giliran selanjutnya
        let newTop = game.discard[game.discard.length-1]
        let nextPlayer = game.players[game.turn]
        let txt = `✅ *Kartu Dimainkan* \n`
        txt += `Top Deck: ${newTop.color} ${newTop.value}\n`
        txt += `Giliran: @${nextPlayer.id.split('@')[0]}`
        
        this.reply(m.chat, txt, m, { mentions: [nextPlayer.id] })
    }

    // 3. Draw Kartu
    if (m.text.toLowerCase() === 'draw') {
        if (game.players[game.turn].id !== m.sender) return m.reply('⏳ Bukan giliranmu!')
        
        game.giveCards(game.players[game.turn], 1)
        game.nextTurn()
        
        let nextPlayer = game.players[game.turn]
        let txt = `📥 @${m.sender.split('@')[0]} mengambil kartu.\nGiliran: @${nextPlayer.id.split('@')[0]}`
        this.reply(m.chat, txt, m, { mentions: [m.sender, nextPlayer.id] })
    }
}