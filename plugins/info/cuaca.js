import axios from 'axios'

let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) return m.reply(`Masukkan nama kota.\nContoh: *${usedPrefix + command} Bandung*`)

  // 1. Reaksi Loading
  await m.react('🔍')

  try {
    // --- METODE 1: WTTR.IN (Tanpa Limit API Key) ---
    // format=j1: Mengambil data JSON
    // lang=id: Meminta respon bahasa Indonesia
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1&lang=id`)
    const data = res.data

    if (!data || !data.current_condition || data.current_condition.length === 0) {
        throw new Error('Data Wttr kosong')
    }

    const current = data.current_condition[0]
    const area = data.nearest_area[0]
    
    // Mengambil deskripsi cuaca dalam bahasa Indonesia
    // (wttr.in kadang menaruh terjemahan di array lang_id)
    let weatherDesc = current.weatherDesc[0].value
    if (current.lang_id && current.lang_id.length > 0) {
        weatherDesc = current.lang_id[0].value
    }

    // Susun Pesan
    let txt = `☁️ *CUACA SAAT INI* ☁️\n`
    txt += `📍 *Lokasi:* ${area.areaName[0].value}, ${area.region[0].value}\n`
    txt += `🗺️ *Negara:* ${area.country[0].value}\n\n`
    
    txt += `🌡️ *Suhu:* ${current.temp_C}°C (Terasa ${current.FeelsLikeC}°C)\n`
    txt += `🌤️ *Kondisi:* ${weatherDesc}\n`
    txt += `💧 *Kelembapan:* ${current.humidity}%\n`
    txt += `💨 *Angin:* ${current.windspeedKmph} km/jam (Arah ${current.winddir16Point})\n`
    txt += `👁️ *Jarak Pandang:* ${current.visibility} km\n`
    txt += `☀️ *UV Index:* ${current.uvIndex}\n`

    // Menampilkan prakiraan besok (Opsional)
    if (data.weather && data.weather.length > 1) {
        const besok = data.weather[1]
        txt += `\n📅 *Prakiraan Besok:*\n`
        txt += `• Suhu: ${besok.mintempC}°C - ${besok.maxtempC}°C\n`
        txt += `• Matahari: 🌅 ${besok.astronomy[0].sunrise} - 🌇 ${besok.astronomy[0].sunset}\n`
    }

    txt += `\n_Powered by Wttr.in (Open Source)_`

    await m.reply(txt)
    await m.react('✅')

  } catch (e) {
    console.error("Error Wttr:", e)
    
    // --- METODE 2: CADANGAN (Siputzx) ---
    // Jika metode pertama gagal, kita pakai API Siputzx dari config kamu
    try {
        // Ganti reaksi jadi loading ulang
        await m.react('🔄') 
        
        const resBackup = await axios.get(`${global.APIs.siputzx}/api/tools/cuaca?kota=${encodeURIComponent(text)}`)
        const dataBackup = resBackup.data.data

        if (!dataBackup) throw new Error('Data Siputzx kosong')

        let txt = `☁️ *CUACA (Backup)* ☁️\n`
        txt += `📍 *Lokasi:* ${dataBackup.location.name}\n`
        txt += `🌡️ *Suhu:* ${dataBackup.current.temperature}°C\n`
        txt += `🌤️ *Kondisi:* ${dataBackup.current.condition}\n`
        txt += `💧 *Kelembapan:* ${dataBackup.current.humidity}%\n`
        txt += `💨 *Angin:* ${dataBackup.current.wind_speed} km/jam`

        await m.reply(txt)
        await m.react('✅')

    } catch (err2) {
        console.error("Error Backup:", err2)
        await m.react('❌')
        m.reply("❌ Kota tidak ditemukan. Pastikan ejaan nama kota benar (Contoh: *Yogyakarta*, bukan *Jogja*).")
    }
  }
}

handler.help = ['cuaca <kota>']
handler.tags = ['information']
handler.command = /^(cuaca|weather)$/i

export default handler