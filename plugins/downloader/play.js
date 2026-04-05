import yts from 'yt-search'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

// ==========================================
//  DAFTAR SERVER DOWNLOADER (Amira -> Ryzumi)
// ==========================================
const apis = [
    // 1. Amira (Prioritas Utama)
    {
        name: 'Amira',
        // quality=128 cukup untuk musik WA, tidak terlalu besar
        url: (link) => `${global.APIs.amira}/v1/youtube/download?url=${encodeURIComponent(link)}&quality=128&mode=audio`,
        timeout: 20000, 
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.download) {
                return {
                    url: res.data.download,
                    title: res.data.title,
                }
            }
            return null
        }
    },
    // 2. Ryzumi (Cadangan)
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/ytmp3?url=${encodeURIComponent(link)}`,
        timeout: 20000,
        parser: (response) => {
            const data = response.data
            if (!data.url && !data.result?.url) return null
            return {
                url: data.url || data.result?.url,
                title: data.title || data.result?.title,
                thumbnail: data.thumbnail || data.result?.thumbnail
            }
        }
    }
]

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `Gunakan format: ${usedPrefix}${command} <judul lagu/link>`

  // 1. Cari Metadata Video dulu via yt-search
  // Agar tampilan di WA rapi (ada judul & thumbnail asli) sebelum download dimulai
  let vid = (await yts(text)).videos[0]
  if (!vid) throw 'Video tidak ditemukan, coba judul lain.'
  const { title, thumbnail, url } = vid

  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
  await conn.sendPresenceUpdate('recording', m.chat)

  let success = false
  let lastError = ''

  // 2. Loop Mencoba Server
  for (let i = 0; i < apis.length; i++) {
      const api = apis[i]
      try {
          console.log(`[PLAY] Mencoba server: ${api.name}...`)

          // A. Request Link Download (Metadata API)
          const response = await axios.get(api.url(url), {
              timeout: api.timeout,
              headers: {
                  // Identitas Browser (Penting agar API tidak menolak)
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://google.com'
              }
          })

          const data = api.parser(response)
          if (!data || !data.url) {
              console.log(`[PLAY] Server ${api.name} tidak memberikan URL download.`)
              continue 
          }

          // B. Eksekusi Download File (Streaming)
          const safeTitle = (data.title || title).replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
          const tmpDir = path.join(process.cwd(), 'tmp')
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
          const filePath = path.join(tmpDir, `${safeTitle}.mp3`)

          console.log(`[PLAY] Mulai download dari: ${data.url}`)

          const videoResponse = await axios({
              method: 'GET',
              url: data.url,
              responseType: 'stream',
              // Timeout 60 Detik: Mencegah bot stuck jika server macet
              timeout: 60000, 
              headers: { 
                  // HEADER LENGKAP (ANTI-BLOKIR)
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Connection': 'keep-alive',
                  'Referer': 'https://google.com'
              }
          })

          await streamPipeline(videoResponse.data, fs.createWriteStream(filePath))

          console.log(`[PLAY] Download selesai, mengirim file...`)

          // C. Kirim File ke User
          await conn.sendMessage(m.chat, {
              audio: { url: filePath },
              mimetype: 'audio/mpeg',
              fileName: `${safeTitle}.mp3`,
          }, { quoted: m })

          // Hapus file sampah
          fs.unlink(filePath, (err) => { if (err) console.error(err) })
          
          success = true
          break // Berhasil? Stop loop.

      } catch (e) {
          console.log(`Server ${api.name} gagal: ${e.message}`)
          lastError = e.message
          continue // Lanjut ke server cadangan
      }
  }

  if (success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`Gagal mendownload audio. Semua server sibuk/error.\nInfo: ${lastError}`)
  }
}

handler.help = ['play'].map(v => v + ' <judul/link>')
handler.tags = ['Menu Downloader']
handler.command = /^(play|song|lagu|ytmp3)$/i
handler.limit = true

export default handler