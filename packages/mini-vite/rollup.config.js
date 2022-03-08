
import path from 'path'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default (commandLineArgs)=> {
  // 通过命令行是否存在watch监听的参数，判断是否是dev环境
  const isDev = commandLineArgs.watch
  const isProduction = !isDev
  return [
    {
      input: {
        index: path.resolve(__dirname, 'src/node/index.ts'),
        cli: path.resolve(__dirname, 'src/node/cli.ts')
      },
      output: {
        dir: path.resolve(__dirname, 'dist'),
        entryFileNames: `node/[name].js`,
        chunkFileNames: 'node/chunks/dep-[hash].js',
        exports: 'named', // ??
        format: 'cjs',
        externalLiveBindings: false, // ??
        freeze: false, // ??
        // 是否生成源代码
        sourcemap: !isProduction
      },
      // dependencies排除，不打进包内；devDependencies在开发环境排除，rollup执行时不编译
      external: [
        ...Object.keys(require('./package.json').dependencies),
          ...(isProduction
            ? []
            : Object.keys(require('./package.json').devDependencies))
      ],
      plugins: [
        // ?? 下面👇🏻配置项每个的作用
        nodeResolve({ preferBuiltins: true }),
        typescript({
          tsconfig: 'src/node/tsconfig.json',
          module: 'esnext',
          target: 'es2019',
          include: ['src/**/*.ts', 'types/**'],
          exclude: ['src/**/__tests__/**'],
          esModuleInterop: true,
        }),
        commonjs({
          extensions: ['.js'],
        }),
        json(),
      ]
    }
  ]
}
