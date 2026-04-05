import yts from 'yt-search'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

const apis = [
    {
        name: 'Amira',
        url: (link) => `${global.APIs.amira}/v1/youtube/download?url=${encodeURIComponent(link)}&quality=360&mode=video`,
        timeout: 60000, 
        parser: (response) => {
            const res = response.data
            if (res.success && res.data && res.data.download) {
                return {
                    url: res.data.download,
                    title: res.data.title
                }
            }
            return null
        }
    },
    {
        name: 'Ryzumi',
        url: (link) => `${global.APIs.ryzumi}/api/downloader/ytmp4?url=${encodeURIComponent(link)}`,
        timeout: 150000,
        parser: (response) => {
            const data = response.data
            if (!data.url && !data.result?.url) return null
            return {
                url: data.url || data.result?.url,
                title: data.title || data.result?.title
            }
        }
    }
]

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `Linknya mana?`

  // 1. Reaksi Proses
  await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } })
  await conn.sendPresenceUpdate('recording', m.chat)

  // Ambil judul dari yt-search sebagai backup title
  let vid = (await yts(text)).videos[0]
  if (!vid) throw 'Video tidak ditemukan.'
  const { title, url } = vid

  let success = false
  let lastError = ''

  for (let i = 0; i < apis.length; i++) {
      const api = apis[i]
      try {
          const response = await axios.get(api.url(url), {
              timeout: api.timeout,
              headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://google.com'
              }
          })

          const data = api.parser(response)
          if (!data || !data.url) continue 

          const safeTitle = (data.title || title).replace(/[\\/:*?"<>|]/g, '').slice(0, 50)
          const tmpDir = path.join(process.cwd(), 'tmp')
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
          const filePath = path.join(tmpDir, `${safeTitle}.mp4`)

          // Download dengan Penyamaran Lengkap
          const videoResponse = await axios({
              method: 'GET',
              url: data.url,
              responseType: 'stream',
              timeout: 60000,
              headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
              caption: data.title || title
          }, { quoted: m })

          fs.unlink(filePath, (err) => { if (err) console.error(err) })
          success = true
          break 

      } catch (e) {
          console.log(`Server ${api.name} gagal: ${e.message}`)
          lastError = e.message
          continue 
      }
  }

  if (success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      m.reply(`Gagal.`)
  }
}

handler.help = ['ytv <link>']
handler.tags = ['Menu Downloader']
handler.command = /^(ytmp4|ytv)$/i
handler.limit = true

export default handler