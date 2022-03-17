import { cac } from 'cac'
import colors from 'picocolors'

import type { ServerOptions } from './server'
import type { LogLevel } from './logger'
import { createLogger } from './logger'
// global options
interface GlobalCLIOptions {
  '--'?: string[]
  c?: boolean | string
  config?: string
  base?: string
  l?: LogLevel
  logLevel?: LogLevel
  clearScreen?: boolean
  d?: boolean | string
  debug?: boolean | string
  f?: string
  filter?: string
  m?: string
  mode?: string
}
/**
 * removing global flags before passing as command specific sub-configs
 */
function cleanOptions<Options extends GlobalCLIOptions>(
  options: Options
): Omit<Options, keyof GlobalCLIOptions> {
  const ret = { ...options }
  delete ret['--']
  delete ret.c
  delete ret.config
  delete ret.base
  delete ret.l
  delete ret.logLevel
  delete ret.clearScreen
  delete ret.d
  delete ret.debug
  delete ret.f
  delete ret.filter
  delete ret.m
  delete ret.mode
  return ret
}
const cli = cac('vite')

cli
  .option('-c, --config <file>', `[string] use specified config file`)
  .option('--base <path>', `[string] public base path (default: /)`)
  .option('-l, --logLevel <level>', `[string] info | warn | error | silent`)
  .option('--clearScreen', `[boolean] allow/disable clear screen when logging`)
  .option('-d, --debug [feat]', `[string | boolean] show debug logs`)
  .option('-f, --filter <filter>', `[string] filter debug logs`)
  .option('-m, --mode <mode>', `[string] set env mode`)

// dev
cli
  .command('[root]', 'start dev server') // default command
  .alias('serve') // the command is called 'serve' in Vite's API
  .alias('dev') // alias to align with the script name
  .option('--host [host]', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--https', `[boolean] use TLS + HTTP/2`)
  .option('--open [path]', `[boolean | string] open browser on startup`)
  .option('--cors', `[boolean] enable CORS`)
  .option('--strictPort', `[boolean] exit if specified port is already in use`)
  .option(
    '--force',
    `[boolean] force the optimizer to ignore the cache and re-bundle`
  )
  .action(async (root: string, options: ServerOptions & GlobalCLIOptions) => {
    const { createServer } = await import('./server')
    try {
      // 获取server实例
      const server = await createServer({
        root,
        configFile: options.config,
        logLevel: options.logLevel,
        server: cleanOptions(options)
      })

      if (!server.httpServer) {
        throw new Error('HTTP server not available')
      }
      await server.listen()
      const info = server.config.logger.info

      info(
        colors.cyan(`\n  vite v${require('mini-vite/package.json').version}`) +
          colors.green(` dev server running at:\n`),
        {
          clear: !server.config.logger.hasWarned
        }
      )
    } catch (e) {
      createLogger(options.logLevel).error(
        colors.red(`error when starting dev server:\n${e.stack}`),
        { error: e }
      )
      process.exit(1)
    }
  })

cli.help()
cli.version(require('mini-vite/package.json').version)

cli.parse()
