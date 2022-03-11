#!/usr/bin/env node
/* eslint-disable node/no-restricted-require */
const { performance } = require('perf_hooks')

if (!__dirname.includes('node_modules')) {
  try {
    // only available as dev dependency
    require('source-map-support').install()
  } catch (e) {}
}

// 命令行cli 支持-d --debug="" --filter 来开启debug模式
const debugIndex = process.argv.findIndex((arg) => /^(?:-d|--debug)$/.test(arg))
const filterIndex = process.argv.findIndex((arg) =>
  /^(?:-f|--filter)$/.test(arg)
)
// 大于0 则说明有找到-d --debug
// 找到则格式化并赋值给环境变量，以在全局中使用
if (debugIndex > 0) {
  // 取得value值
  let value = process.argv[debugIndex + 1]
  // 格式化value值
  if (!value || value.startsWith('-')) {
    value = 'mini-vite:*'
  } else {
    // support debugging multiple flags with comma-separated list
    value = value
      .split(',')
      .map((v) => `mini-vite:${v}`)
      .join(',')
  }
  process.env.DEBUG = `${
    process.env.DEBUG ? process.env.DEBUG + ',' : ''
  }${value}`

  if (filterIndex > 0) {
    const filter = process.argv[filterIndex + 1]
    if (filter && !filter.startsWith('-')) {
      process.env.VITE_DEBUG_FILTER = filter
    }
  }
}

function start() {
  require('../dist/node/cli')
}
start()
