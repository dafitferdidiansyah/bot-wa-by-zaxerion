class Uno {
    constructor() {
        this.deck = []
        this.discard = []
        this.players = []
        this.turn = 0
        this.direction = 1 // 1: Clockwise, -1: Counter-Clockwise
        this.status = 'WAITING' // WAITING, PLAYING
        this.winner = null
    }

    init() {
        const colors = ['🟥', '🟨', '🟩', '🟦']
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        const specials = ['🚫', '⇄', '+2'] // Skip, Reverse, Draw 2
        const wilds = ['🎨', '+4'] // Wild, Wild Draw 4

        // Generate Number Cards
        for (let color of colors) {
            for (let num of numbers) {
                this.deck.push({ color, value: num, type: 'NUMBER' })
                if (num !== '0') this.deck.push({ color, value: num, type: 'NUMBER' })
            }
            // Generate Special Cards
            for (let special of specials) {
                this.deck.push({ color, value: special, type: 'SPECIAL' })
                this.deck.push({ color, value: special, type: 'SPECIAL' })
            }
        }

        // Generate Wild Cards
        for (let i = 0; i < 4; i++) {
            for (let wild of wilds) {
                this.deck.push({ color: '⚫', value: wild, type: 'WILD' })
            }
        }

        this.shuffle()
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    addPlayer(id, name) {
        if (this.players.find(p => p.id === id)) return false
        this.players.push({ id, name, hand: [] })
        return true
    }

    removePlayer(id) {
        this.players = this.players.filter(p => p.id !== id)
    }

    start() {
        if (this.players.length < 2) return false
        this.status = 'PLAYING'
        this.init()
        
        // Deal 7 cards to each player
        for (let player of this.players) {
            for (let i = 0; i < 7; i++) {
                player.hand.push(this.drawCard())
            }
        }

        // Start discard pile
        let firstCard = this.drawCard()
        while (firstCard.type === 'WILD') { // Don't start with wild
            this.deck.push(firstCard)
            this.shuffle()
            firstCard = this.drawCard()
        }
        this.discard.push(firstCard)
        return true
    }

    drawCard() {
        if (this.deck.length === 0) {
            if (this.discard.length === 0) return null
            const top = this.discard.pop()
            this.deck = this.discard
            this.discard = [top]
            this.shuffle()
        }
        return this.deck.pop()
    }

    playCard(playerId, cardIndex, wildColor = null) {
        const player = this.players.find(p => p.id === playerId)
        if (this.players[this.turn].id !== playerId) return 'NOT_TURN'
        
        const card = player.hand[cardIndex]
        if (!card) return 'INVALID_CARD'

        const top = this.discard[this.discard.length - 1]

        // Validation Logic
        let isValid = false
        if (card.type === 'WILD') isValid = true
        else if (card.color === top.color || card.value === top.value) isValid = true
        // Handle post-wild color match
        else if (top.color === '⚫' && top.wildColor && card.color === top.wildColor) isValid = true

        if (!isValid) return 'INVALID_MOVE'

        // Execute Play
        player.hand.splice(cardIndex, 1)
        
        // Handle Wild Color
        if (card.type === 'WILD') {
            if (!wildColor && ['🟥', '🟨', '🟩', '🟦'].includes(wildColor)) return 'NEED_COLOR' // Simplification
            card.wildColor = wildColor || '🟥' // Default red if bot confused, but player should pick
        }

        this.discard.push(card)

        // Handle Effects
        let next = true
        if (card.value === '🚫') this.nextTurn() // Skip
        if (card.value === '⇄') this.direction *= -1 // Reverse
        if (card.value === '+2') {
            this.nextTurn()
            this.giveCards(this.players[this.turn], 2)
            next = false // Skip turn after draw
        }
        if (card.value === '+4') {
            this.nextTurn()
            this.giveCards(this.players[this.turn], 4)
            next = false
        }

        if (player.hand.length === 0) {
            this.winner = player
            this.status = 'ENDED'
            return 'WIN'
        }

        if (next) this.nextTurn()
        return 'SUCCESS'
    }

    giveCards(player, count) {
        for (let i = 0; i < count; i++) player.hand.push(this.drawCard())
    }

    nextTurn() {
        this.turn += this.direction
        if (this.turn >= this.players.length) this.turn = 0
        if (this.turn < 0) this.turn = this.players.length - 1
    }
}

export default Uno