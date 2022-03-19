import fs from 'fs'
import path from 'path'
import type { LogLevel, Logger } from './logger'
import type { ServerOptions, ResolvedServerOptions } from './server'
import { resolveServerOptions } from './server'
import { performance } from 'perf_hooks'
import {
  createDebugger,
  lookupFile,
  dynamicImport,
  isObject,
  normalizePath
} from './utils'
import { createLogger } from './logger'
import colors from 'picocolors'
import { build } from 'esbuild'

const debug = createDebugger('mini-vite:config')

export interface ConfigEnv {
  command: 'build' | 'serve'
  mode: string
}
export type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>
export type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn
export interface UserConfig {
  /**
   * Project root directory. Can be an absolute path, or a path relative from
   * the location of the config file itself.
   * @default process.cwd()
   */
  root?: string
  /**
   * Server specific options, e.g. host, port, https...
   */
  server?: ServerOptions
  logLevel?: LogLevel
  customLogger?: Logger
  /**
   * Default: true
   */
  clearScreen?: boolean
}

export interface InlineConfig extends UserConfig {
  configFile?: string | false
  envFile?: false
}

export type ResolvedConfig = {
  configFile: string | undefined
  inlineConfig: InlineConfig
  configFileDependencies: string[]
  server: ResolvedServerOptions
  logger: Logger
  base: string
}

export async function resolveConfig(
  inlineConfig: InlineConfig,
  command: 'build' | 'serve',
  defaultMode = 'development'
): Promise<ResolvedConfig> {
  let config = inlineConfig
  let configFileDependencies: string[] = []

  const configEnv = {
    mode: defaultMode,
    command
  }

  let { configFile } = config

  if (configFile !== false) {
    const loadResult = await loadConfigFromFile(
      configEnv,
      configFile,
      config.root,
      config.logLevel
    )

    if (loadResult) {
      config = mergeConfig(loadResult.config, config)
      configFile = loadResult.path
      configFileDependencies = loadResult.dependencies
    }
  }
  // Define logger
  const logger = createLogger(config.logLevel, {
    allowClearScreen: config.clearScreen,
    customLogger: config.customLogger
  })
  // resolve root
  const resolvedRoot = normalizePath(
    config.root ? path.resolve(config.root) : process.cwd()
  )
  const server = resolveServerOptions(resolvedRoot, config.server)

  return {
    configFile: undefined,
    inlineConfig,
    server,
    configFileDependencies,
    logger,
    base: '/'
  }
}

export async function loadConfigFromFile(
  configEnv: ConfigEnv,
  configFile?: string,
  configRoot: string = process.cwd(),
  logLevel?: LogLevel
): Promise<{
  path: string
  config: UserConfig
  dependencies: string[]
} | null> {
  const start = performance.now()
  const getTime = () => `${(performance.now() - start).toFixed(2)}ms`

  let resolvedPath: string | undefined
  let isTS = false
  let isESM = false
  let dependencies: string[] = []

  try {
    const pkg = lookupFile(configRoot, ['package.json'])
    if (pkg && JSON.parse(pkg).type === 'module') {
      isESM = true
    }
  } catch (e) {}

  if (configFile) {
    // explicit config path is always resolved from cwd
    resolvedPath = path.resolve(configFile)
    isTS = configFile.endsWith('.ts')

    if (configFile.endsWith('.mjs')) {
      isESM = true
    }
  } else {
    // implicit config file loaded from inline root (if present)
    // otherwise from cwd
    const jsconfigFile = path.resolve(configRoot, 'vite.config.js')
    if (fs.existsSync(jsconfigFile)) {
      resolvedPath = jsconfigFile
    }

    if (!resolvedPath) {
      const mjsconfigFile = path.resolve(configRoot, 'vite.config.mjs')
      if (fs.existsSync(mjsconfigFile)) {
        resolvedPath = mjsconfigFile
        isESM = true
      }
    }

    if (!resolvedPath) {
      const tsconfigFile = path.resolve(configRoot, 'vite.config.ts')
      if (fs.existsSync(tsconfigFile)) {
        resolvedPath = tsconfigFile
        isTS = true
      }
    }

    if (!resolvedPath) {
      const cjsConfigFile = path.resolve(configRoot, 'vite.config.cjs')
      if (fs.existsSync(cjsConfigFile)) {
        resolvedPath = cjsConfigFile
        isESM = false
      }
    }
  }
  if (!resolvedPath) {
    debug('no config file found.')
    return null
  }

  try {
    let userConfig: UserConfigExport | undefined

    if (isESM) {
      const fileUrl = require('url').pathToFileURL(resolvedPath)
      const bundled = await bundleConfigFile(resolvedPath, true)
      dependencies = bundled.dependencies
      if (isTS) {
        fs.writeFileSync(resolvedPath + '.js', bundled.code)
        userConfig = (await dynamicImport(`${fileUrl}.js?t=${Date.now()}`))
          .default
        fs.unlinkSync(resolvedPath + '.js')
      } else {
        userConfig = (await dynamicImport(`${fileUrl}?t=${Date.now()}`)).default
        debug(`native esm config loaded in ${getTime()}`, fileUrl)
      }
    }
    if (!userConfig) {
      // Bundle config file and transpile it to cjs using esbuild.
      const bundled = await bundleConfigFile(resolvedPath)
      dependencies = bundled.dependencies
      userConfig = await loadConfigFromBundledFile(resolvedPath, bundled.code)
      debug(`bundled config file loaded in ${getTime()}`)
    }
    const config = await (typeof userConfig === 'function'
      ? userConfig(configEnv)
      : userConfig)
    if (!isObject(config)) {
      throw new Error(`config must export or return an object.`)
    }
    return {
      path: normalizePath(resolvedPath),
      config,
      dependencies
    }
  } catch (e) {
    createLogger(logLevel).error(
      colors.red(`failed to load config from ${resolvedPath}`),
      { error: e }
    )
    throw e
  }
}

async function bundleConfigFile(
  fileName: string,
  isESM = false
): Promise<{ code: string; dependencies: string[] }> {
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    outfile: 'out.js',
    write: false,
    platform: 'node',
    bundle: true,
    format: isESM ? 'esm' : 'cjs',
    sourcemap: 'inline',
    metafile: true,
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            const id = args.path
            if (id[0] !== '.' && !path.isAbsolute(id)) {
              return {
                external: true
              }
            }
          })
        }
      },
      {
        name: 'replace-import-meta',
        setup(build) {
          build.onLoad({ filter: /\.[jt]s$/ }, async (args) => {
            const contents = await fs.promises.readFile(args.path, 'utf8')
            return {
              loader: args.path.endsWith('.ts') ? 'ts' : 'js',
              contents: contents
                .replace(
                  /\bimport\.meta\.url\b/g,
                  JSON.stringify(`file://${args.path}`)
                )
                .replace(
                  /\b__dirname\b/g,
                  JSON.stringify(path.dirname(args.path))
                )
                .replace(/\b__filename\b/g, JSON.stringify(args.path))
            }
          })
        }
      }
    ]
  })
  const { text } = result.outputFiles[0]
  return {
    code: text,
    dependencies: result.metafile ? Object.keys(result.metafile.inputs) : []
  }
}
interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any
}
async function loadConfigFromBundledFile(
  fileName: string,
  buildedCode: string
): Promise<UserConfig> {
  const extension = path.extname(fileName)
  // Instruct require on how to handle certain file extensions.
  // 指示require怎么处理这样的后缀文件
  // defaultLoader node require对该后缀文件默认的处理方法
  const defaultLoader = require.extensions[extension]!
  // 这里自定义处理方法似乎毫无用处，用做后续的拓展？
  require.extensions[extension] = (module: NodeModule, filename: string) => {
    if (filename === fileName) {
      ;(module as NodeModuleWithCompile)._compile(buildedCode, filename)
    } else {
      defaultLoader(module, filename)
    }
  }
  // 清楚缓存cache
  delete require.cache[require.resolve(fileName)]
  // 引入模块
  const raw = require(fileName)
  const config = raw.__esModule ? raw.default : raw
  // 重置为默认加载方法
  require.extensions[extension] = defaultLoader
  return config
}

export function mergeConfig(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  isRoot = true
): Record<string, any> {
  return mergeConfigRecursively(defaults, overrides, isRoot ? '' : '.')
}

function mergeConfigRecursively(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath: string
) {
  const merged: Record<string, any> = { ...defaults }
  return merged
}
