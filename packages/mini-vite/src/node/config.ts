import fs from 'fs'
import path from 'path'
import type { LogLevel } from './logger'
import type { ServerOptions } from './server'
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
}

export interface InlineConfig extends UserConfig {
  configFile?: string | false
  envFile?: false
}

export type ResolvedConfig = {
  configFile: string | undefined
  inlineConfig: InlineConfig
}

export async function resolveConfig(
  inlineConfig: InlineConfig,
  command: 'build' | 'serve',
  defaultMode = 'development'
): Promise<ResolvedConfig> {
  console.log('resolveConfig----  start')
  const config = inlineConfig
  const configEnv = {
    mode: defaultMode,
    command
  }

  const { configFile } = config
  console.log('config: ', config)

  if (configFile !== false) {
    const loadResult = await loadConfigFromFile(
      configEnv,
      configFile,
      config.root,
      config.logLevel
    )
    console.log('loadResult: ', loadResult)
  }
  return {
    configFile: undefined,
    inlineConfig
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

  console.log('configFile: ', configFile)
  if (configFile) {
    // explicit config path is always resolved from cwd
    resolvedPath = path.resolve(configFile)
    isTS = configFile.endsWith('.ts')

    if (configFile.endsWith('.mjs')) {
      isESM = true
    }
  }
  console.log('resolvedPath: ', resolvedPath)
  if (!resolvedPath) {
    debug('no config file found.')
    return null
  }

  try {
    let userConfig: UserConfigExport | undefined

    if (isESM) {
      const fileUrl = require('url').pathToFileURL(resolvedPath)
      console.log('fileUrl: ', fileUrl)
      const bundled = await bundleConfigFile(resolvedPath, true)
      console.log('bundled----: ', bundled)
      dependencies = bundled.dependencies
      if (isTS) {
        fs.writeFileSync(resolvedPath + '.js', bundled.code)
        userConfig = (await dynamicImport(`${fileUrl}.js?t=${Date.now()}`))
          .default
        // fs.unlinkSync(resolvedPath + '.js')
      } else {
        userConfig = (await dynamicImport(`${fileUrl}?t=${Date.now()}`)).default
        debug(`native esm config loaded in ${getTime()}`, fileUrl)
      }
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
