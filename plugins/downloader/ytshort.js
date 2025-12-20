import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

const apis = [
    // 1. Amira (Ganti ke Endpoint Youtube Download khusus, bukan AIO)
    // Endpoint ini lebih stabil untuk Shorts dibanding AIO
    {
        name: 'Amira YT',
        url: (link) => `${global.APIs.amira}/v1/youtube/download?url=${encodeURIComponent(link)}&quality=720&mode=video`,
        timeout: 60000,
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.download) {
                return {
                    url: res.data.download,
                    title: res.data.title || 'YouTube Shorts',
                    quality: 'HD'
                }
            }
            return null
        }
    },
    // 2. Ryzumi (Backup dengan Header Super Lengkap)
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/ytmp4?url=${encodeURIComponent(link)}`,
        timeout: 15000,
        parser: (response) => {
            const data = response.data
            if (!data.url && !data.result?.url) return null
            return {
                url: data.url || data.result?.url,
                title: data.title || data.result?.title,
                quality: 'SD/HD'
            }
        }
    }
]

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `Linknya mana?`
  if (!/shorts|youtu\.be|youtube\.com/i.test(text)) throw '❌ Link tidak valid!'

  // 1. Reaksi Proses
  await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }) 
  await conn.sendPresenceUpdate('recording', m.chat)

  let success = false
  let lastError = ''

  for (let i = 0; i < apis.length; i++) {
      const api = apis[i]
      try {
          // Request Metadata
          const response = await axios.get(api.url(text), {
              timeout: api.timeout,
              headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://google.com',
                  'Origin': 'https://google.com',
                  'Accept': 'application/json, text/plain, */*'
              }
          })

          const data = api.parser(response)
          if (!data || !data.url) {
              lastError = `Server ${api.name} tidak ada url.`
              continue 
          }

          const safeTitle = `shorts_${Date.now()}`
          const tmpDir = path.join(process.cwd(), 'tmp')
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
          const filePath = path.join(tmpDir, `${safeTitle}.mp4`)

          // Download Stream
          const videoResponse = await axios({
              method: 'GET',
              url: data.url,
              responseType: 'stream',
              timeout: 60000,
              headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  'Connection': 'keep-alive',
                  'Referer': 'https://google.com'
              }
          })

          await streamPipeline(videoResponse.data, fs.createWriteStream(filePath))

          // 2. Kirim Video Simple
          await conn.sendMessage(m.chat, {
              video: { url: filePath },
              fileName: `${safeTitle}.mp4`,
              mimetype: 'video/mp4',
              caption: data.title
          }, { quoted: m })

          fs.unlink(filePath, () => {})
          success = true
          break 

      } catch (e) {
          console.log(`Shorts ${api.name} gagal: ${e.message}`)
          lastError = e.message
          continue 
      }
  }

  if (success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`Gagal: ${lastError}`)
  }
}

handler.help = ['shorts <link>']
handler.tags = ['Menu Downloader']
handler.command = /^(shorts|ytshorts|sw)$/i
handler.limit = true

export default handler