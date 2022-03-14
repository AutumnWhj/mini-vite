import type { CommonServerOptions } from '../http'
import type { WatchOptions } from 'chokidar'
import type { InlineConfig, ResolvedConfig } from '../config'
import { resolveConfig } from '../config'
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

export interface ViteDevServer {
  config: ResolvedConfig
}

export async function createServer(
  inlineConfig: InlineConfig = {}
): Promise<ViteDevServer> {
  // ！！读取vite配置
  console.log('createServer --- start')
  const config = await resolveConfig(inlineConfig, 'serve', 'development')
  return {
    config
  }
  // ！！获取项目根目录
  // ！！获取HTTP服务配置
  // ！！中间件的逻辑
  // ！！开启http服务
  // ！！开启WebSocket服务，并与http建立链接
  // ！！开启文件监听
  // ！！生成文件模块映射，热更新很关键
  // ！！构建一个vite插件的执行环境，对plugin的钩子进行处理
  // ！！其他文件监听以及中间件处理逻辑
  // ！！返回server对象
}
