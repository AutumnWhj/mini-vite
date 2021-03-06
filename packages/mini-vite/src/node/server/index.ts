import connect from 'connect'
import type { Connect } from 'types/connect'
import type * as http from 'http'
import type { CommonServerOptions } from '../http'
import type { WatchOptions } from 'chokidar'
import type { InlineConfig, ResolvedConfig } from '../config'
import { resolveConfig } from '../config'
import { resolveHttpServer, httpServerStart } from '../http'
import { resolveHostname } from '../utils'
import { printCommonServerUrls } from '../logger'
export interface ServerOptions extends CommonServerOptions {
  /**
   * Force dep pre-optimization regardless of whether deps have changed.
   */
  force?: boolean
  /**
   * Configure HMR-specific options (port, host, path & protocol)
   */
  // hmr?: HmrOptions | boolean
  /**
   * chokidar watch options
   * https://github.com/paulmillr/chokidar#api
   */
  watch?: WatchOptions
  /**
   * Create Vite dev server to be used as a middleware in an existing server
   */
  middlewareMode?: boolean | 'html' | 'ssr'
  /**
   * Prepend this folder to http requests, for use when proxying vite as a subfolder
   * Should start and end with the `/` character
   */
  base?: string
  /**
   * Options for files served via '/\@fs/'.
   */
  // fs?: FileSystemServeOptions
  /**
   * Origin for the generated asset URLs.
   */
  origin?: string
  /**
   * Pre-transform known direct imports
   *
   * @experimental this option is experimental and might be changed in the future
   * @default true
   */
  preTransformRequests?: boolean
}
export interface ResolvedServerOptions extends ServerOptions {
  fs: Required<FileSystemServeOptions>
}
export interface FileSystemServeOptions {
  /**
   * Strictly restrict file accessing outside of allowing paths.
   *
   * Set to `false` to disable the warning
   *
   * @default true
   */
  strict?: boolean

  /**
   * Restrict accessing files outside the allowed directories.
   *
   * Accepts absolute path or a path relative to project root.
   * Will try to search up for workspace root by default.
   */
  allow?: string[]

  /**
   * Restrict accessing files that matches the patterns.
   *
   * This will have higher priority than `allow`.
   * Glob patterns are supported.
   *
   * @default ['.env', '.env.*', '*.crt', '*.pem']
   *
   * @experimental
   */
  deny?: string[]
}

export interface ViteDevServer {
  base?: string
  config: ResolvedConfig
  httpServer: http.Server | null
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
  /**
   * Print server urls
   */
  printUrls(): void
}

export async function createServer(
  inlineConfig: InlineConfig = {}
): Promise<ViteDevServer> {
  // ????????????vite??????
  console.log('createServer --- start')
  const config = await resolveConfig(inlineConfig, 'serve', 'development')
  const serverConfig = config.server
  // ???????????????????????????
  // ????????????HTTP????????????
  // ????????????????????????
  // ????????????http??????
  const middlewares = connect() as Connect.Server
  const httpServer = await resolveHttpServer(serverConfig, middlewares)
  // ????????????WebSocket???????????????http????????????
  // ????????????????????????
  // ???????????????????????????????????????????????????
  // ??????????????????vite???????????????????????????plugin?????????????????????
  // ???????????????????????????????????????????????????
  // ????????????server??????
  const server: ViteDevServer = {
    config,
    httpServer,
    listen(port?: number, isRestart?: boolean) {
      return startServer(server, port, isRestart)
    },
    printUrls() {
      if (httpServer) {
        printCommonServerUrls(httpServer, config.server, config)
      } else {
        throw new Error('cannot print server URLs in middleware mode.')
      }
    }
  }
  return server
}
async function startServer(
  server: ViteDevServer,
  inlinePort?: number,
  isRestart: boolean = false
): Promise<ViteDevServer> {
  const httpServer = server.httpServer
  if (!httpServer) {
    throw new Error('Cannot call server.listen in middleware mode.')
  }
  const options = server.config.server
  const port = inlinePort || options.port || 3000
  const hostname = resolveHostname(options.host)

  await httpServerStart(httpServer, {
    port,
    strictPort: options.strictPort,
    host: hostname.host,
    logger: server.config.logger
  })

  return server
}
export function resolveServerOptions(
  root: string,
  raw?: ServerOptions
): ResolvedServerOptions {
  const server: ResolvedServerOptions = {
    preTransformRequests: true,
    ...(raw as ResolvedServerOptions)
  }
  const allowDirs = server.fs?.allow
  const deny = server.fs?.deny || ['.env', '.env.*', '*.{crt,pem}']

  server.fs = {
    strict: server.fs?.strict ?? true,
    allow: allowDirs,
    deny
  }
  return server
}
