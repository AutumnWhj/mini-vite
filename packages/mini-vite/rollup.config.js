// node API——path，用来处理路径
import path from 'path'
// 允许加载第三方模块
import nodeResolve from '@rollup/plugin-node-resolve'
// rollup支持typescript文件的编译
import typescript from '@rollup/plugin-typescript'
// 将npm模块转换为ES6版本
import commonjs from '@rollup/plugin-commonjs'
// 将.json文件转换为ES6模块(前面说了rollup模块引用只支持ES6+)
import json from '@rollup/plugin-json'

export default (commandLineArgs) => {
  // 执行dev脚本命令时，rollup -c -w 会带有(watch: Boolean)参数
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
        chunkFileNames: 'node/chunks/dep-[hash].js', // 用于代码分割时，对公共模块的命名格式
        exports: 'named', // 使用命名导出，区别于export default https://rollupjs.org/guide/en/#outputexports
        format: 'cjs',
        externalLiveBindings: false, // rollup不会对导入的模块进行监听绑定？——代码优化
        freeze: false,
        // 是否生成源代码
        sourcemap: !isProduction
      },
      // dependencies依赖排除，不打进包内；devDependencies在开发环境排除，rollup执行时不编译
      external: [
        ...Object.keys(require('./package.json').dependencies),
        ...(isProduction
          ? []
          : Object.keys(require('./package.json').devDependencies))
      ],
      plugins: [
        nodeResolve({ preferBuiltins: true }),
        typescript({
          tsconfig: 'src/node/tsconfig.json',
          module: 'esnext',
          target: 'es2019',
          include: ['src/**/*.ts', 'types/**'],
          exclude: ['src/**/__tests__/**'],
          esModuleInterop: true,
          ...(isProduction
            ? {
                declaration: false,
                sourceMap: false
              }
            : {
                declaration: true,
                declarationDir: path.resolve(__dirname, 'dist/node')
              })
        }),
        commonjs({
          extensions: ['.js']
        }),
        json()
      ]
    }
  ]
}
