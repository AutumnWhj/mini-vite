#!/usr/bin/env node
/* eslint-disable node/no-restricted-require */
const { performance } = require('perf_hooks')
console.log('__dirname', __dirname);
if (!__dirname.includes('node_modules')) {
  try {
    // only available as dev dependency
    require('source-map-support').install()
  } catch (e) {}
}

function start() {
  require('../dist/node/cli')
}
start()
