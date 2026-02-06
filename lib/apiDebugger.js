import axios from 'axios'
import chalk from 'chalk'

/**
 * Mengaktifkan Debugger untuk Axios.
 * Ini akan mencetak detail Request dan Response ke console.
 */
export function enableApiDebugger() {
    console.log(chalk.black(chalk.bgCyan('\n [DEBUG MODE ACTIVATED] ')), chalk.cyan('API Traffic will be logged...\n'))

    // 1. Interceptor Request (Saat bot mengirim data ke API)
    axios.interceptors.request.use(request => {
        const method = request.method?.toUpperCase() || 'GET'
        const url = request.url
        const params = request.params ? JSON.stringify(request.params) : ''
        
        console.log(chalk.yellow('╭───────────────────────────────────────────────────╮'))
        console.log(chalk.yellow('│ 📡 OUTGOING REQUEST'))
        console.log(chalk.yellow('├───────────────────────────────────────────────────┤'))
        console.log(`│ ${chalk.bold('Method')} : ${chalk.green(method)}`)
        // PERBAIKAN DI SINI: chalk.blue.underline (bukan chalk.blueUnderline)
        console.log(`│ ${chalk.bold('URL')}    : ${chalk.blue.underline(url)}`)
        
        if (params) {
            console.log(`│ ${chalk.bold('Params')} : ${chalk.gray(params)}`)
        }
        
        if (request.data) {
            let dataLog = request.data
            if (Buffer.isBuffer(request.data)) {
                dataLog = `[Buffer Data: ${request.data.length} bytes]`
            } else if (typeof request.data === 'object') {
                try {
                    dataLog = JSON.stringify(request.data, null, 2)
                } catch {
                    dataLog = request.data
                }
            }
            console.log(`│ ${chalk.bold('Body')}   : ${chalk.magenta(dataLog)}`)
        }
        console.log(chalk.yellow('╰───────────────────────────────────────────────────╯\n'))
        
        request.metadata = { startTime: new Date() }
        return request
    }, error => {
        console.log(chalk.red('❌ [REQUEST ERROR]'), error)
        return Promise.reject(error)
    })

    // 2. Interceptor Response (Saat API membalas bot)
    axios.interceptors.response.use(response => {
        const endTime = new Date()
        const startTime = response.config?.metadata?.startTime || new Date()
        const duration = (endTime - startTime) + 'ms'
        
        console.log(chalk.green('╭───────────────────────────────────────────────────╮'))
        console.log(chalk.green('│ 📥 INCOMING RESPONSE'))
        console.log(chalk.green('├───────────────────────────────────────────────────┤'))
        console.log(`│ ${chalk.bold('Status')} : ${response.status === 200 ? chalk.green('200 OK') : chalk.yellow(response.status)}`)
        console.log(`│ ${chalk.bold('Time')}   : ${chalk.cyan(duration)}`)
        console.log(`│ ${chalk.bold('URL')}    : ${chalk.gray(response.config.url)}`)
        
        let preview = response.data
        if (typeof preview === 'object') {
            try {
                const str = JSON.stringify(preview, null, 2)
                preview = str.length > 3000 ? str.substring(0, 3000) + '... [TRUNCATED]' : str
            } catch {}
        }
        
        console.log(chalk.green('│ 📝 DATA :'))
        console.log(chalk.white(preview))
        console.log(chalk.green('╰───────────────────────────────────────────────────╯\n'))

        return response
    }, error => {
        console.log(chalk.red('╭───────────────────────────────────────────────────╮'))
        console.log(chalk.red('│ 💥 API ERROR / TIMEOUT'))
        console.log(chalk.red('├───────────────────────────────────────────────────┤'))
        if (error.response) {
            console.log(`│ ${chalk.bold('Status')} : ${chalk.red(error.response.status)}`)
            try {
                console.log(`│ ${chalk.bold('Data')}   : ${JSON.stringify(error.response.data)}`)
            } catch {
                console.log(`│ ${chalk.bold('Data')}   : ${error.response.data}`)
            }
        } else {
            console.log(`│ ${chalk.bold('Message')}: ${error.message}`)
        }
        console.log(chalk.red('╰───────────────────────────────────────────────────╯\n'))
        return Promise.reject(error)
    })
}