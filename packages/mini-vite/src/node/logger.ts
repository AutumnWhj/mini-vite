import colors from 'picocolors'
import readline from 'readline'

import type { RollupError } from 'rollup'

export type LogType = 'error' | 'warn' | 'info'
export type LogLevel = LogType | 'silent'
export interface Logger {
  info(msg: string, options?: LogOptions): void
  warn(msg: string, options?: LogOptions): void
  warnOnce(msg: string, options?: LogOptions): void
  error(msg: string, options?: LogErrorOptions): void
  clearScreen(type: LogType): void
  hasErrorLogged(error: Error | RollupError): boolean
  hasWarned: boolean
}
export interface LogOptions {
  clear?: boolean
  timestamp?: boolean
}
export interface LogErrorOptions extends LogOptions {
  error?: Error | RollupError | null
}

export interface LoggerOptions {
  prefix?: string
  allowClearScreen?: boolean
  customLogger?: Logger
}

export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3
}
let lastType: LogType | undefined
let lastMsg: string | undefined
let sameCount = 0

function clearScreen() {
  const repeatCount = process.stdout.rows - 2
  const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : ''
  console.log(blank)
  readline.cursorTo(process.stdout, 0, 0)
  readline.clearScreenDown(process.stdout)
}

/**
 * @param {LogLevel} level:LogLevel='info'
 * @param {LoggerOptions} options:LoggerOptions={}
 * @returns {Logger}
 */
export function createLogger(
  level: LogLevel = 'info',
  options: LoggerOptions = {}
): Logger {
  // 用户可以自定义logger
  if (options.customLogger) {
    return options.customLogger
  }
  // 使用WeakSet缓存 error级别的log
  const loggedErrors = new WeakSet<Error | RollupError>()
  // 设置options的默认值
  const { prefix = '[mini-vite]', allowClearScreen = true } = options
  // 获取log级别
  const thresh = LogLevels[level]
  const canClearScreen =
    allowClearScreen && process.stdout.isTTY && !process.env.CI

  const clear = canClearScreen ? clearScreen : () => {}
  // 重写console log error 等方法
  function output(type: LogType, msg: string, options: LogErrorOptions = {}) {
    // 根据用户定义的log级别来输出内容
    if (thresh >= LogLevels[type]) {
      const method = type === 'info' ? 'log' : type
      const format = () => {
        // 是否显示时间
        if (options.timestamp) {
          const tag =
            type === 'info'
              ? colors.cyan(colors.bold(prefix))
              : type === 'warn'
              ? colors.yellow(colors.bold(prefix))
              : colors.red(colors.bold(prefix))
          return `${colors.dim(new Date().toLocaleTimeString())} ${tag} ${msg}`
        } else {
          return msg
        }
      }
      // 记录出现过的error
      if (options.error) {
        loggedErrors.add(options.error)
      }
      // 是否清屏
      if (canClearScreen) {
        if (type === lastType && msg === lastMsg) {
          sameCount++
          clear()
          console[method](format(), colors.yellow(`(x${sameCount + 1})`))
        } else {
          sameCount = 0
          lastMsg = msg
          lastType = type
          if (options.clear) {
            clear()
          }
          console[method](format())
        }
      } else {
        console[method](format())
      }
    }
  }
  const warnedMessages = new Set<string>()

  const logger: Logger = {
    hasWarned: false,
    info(msg, opts) {
      output('info', msg, opts)
    },
    warn(msg, opts) {
      logger.hasWarned = true
      output('warn', msg, opts)
    },
    warnOnce(msg, opts) {
      if (warnedMessages.has(msg)) return
      logger.hasWarned = true
      output('warn', msg, opts)
      warnedMessages.add(msg)
    },
    error(msg, opts) {
      logger.hasWarned = true
      output('error', msg, opts)
    },
    clearScreen(type) {
      if (thresh >= LogLevels[type]) {
        clear()
      }
    },
    hasErrorLogged(error) {
      return loggedErrors.has(error)
    }
  }
  return logger
}
