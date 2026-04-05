import { GoogleGenAI } from '@google/genai'
import db from '../../lib/database.js'

const genAI = new GoogleGenAI({
    apiKey: global.GEMINI_API_KEY
})

let handler = async (m, { conn, text, usedPrefix, command }) => {
    
    if (!global.GEMINI_API_KEY)
        return m.reply('❌ API Key belum diatur.')

    if (!text)
        return m.reply(`Hai sayang, kamu mau cerita apa? 😘\nKetik: ${usedPrefix + command} aku capek banget...`)

    let storage = m.isGroup 
        ? db.data.chats[m.chat]
        : db.data.users[m.sender]

    if (!storage.aiHistory) storage.aiHistory = []

    const username = m.pushName?.trim() || m.sender.split('@')[0]

    const history = storage.aiHistory.slice(-15)
        .map(v => `${v.role}: ${v.content}`)
        .join('\n')

    const systemPrompt = `
Kamu adalah Mommy Bot yang lembut, keibuan, dan manja.
Lokasi: ${m.isGroup ? "Group Chat (Publik)" : "Private Chat (Privat)"}

History:
${history}

Pesan baru:
[${username}]: ${text}
    `

    try {
        await conn.sendPresenceUpdate('composing', m.chat)

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: "user", parts: [{ text: systemPrompt }] }
            ],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
            }
        })

        let aiResponse =
            response.candidates?.[0]?.content?.parts?.[0]?.text
            || "Mommy nggak bisa jawab itu sayang 🥺"

        storage.aiHistory.push({ role: `[${username}]`, content: text })
        storage.aiHistory.push({ role: '[Mommy]', content: aiResponse })

        if (storage.aiHistory.length > 30)
            storage.aiHistory = storage.aiHistory.slice(-30)

        await conn.sendPresenceUpdate('available', m.chat)
        await m.reply(aiResponse)

    } catch (e) {
        console.error("Gemini Error:", e)
        m.reply("Duh, Mommy pusing sayang… API-nya error 🤕")
    }
}

handler.help = ['mom <text>']
handler.tags = ['ai']
handler.command = /^mom$/i
handler.limit = true

export default handler
