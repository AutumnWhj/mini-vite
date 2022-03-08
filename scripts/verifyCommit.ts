import colors from 'picocolors'
import { readFileSync } from 'fs'
// 获取commit message在.git中的路径，然后用readFileSync对文本进行读取
const msgPath = process.argv[2]
const msg = readFileSync(msgPath, 'utf8').trim()
// 以下对msg进行校验
// ??这里的正则得去补补
const releaseRE = /^v\d/
const commitRE =
  /^(revert: )?(feat|fix|docs|dx|refactor|perf|test|workflow|build|ci|chore|types|wip|release|deps)(\(.+\))?: .{1,50}/

if (!releaseRE.test(msg) && !commitRE.test(msg)) {
  console.error(
    `  ${colors.bgRed(colors.white(' ERROR '))} ${colors.red(
      `invalid commit message format.`
    )}\n\n` +
      colors.red(
        `  Proper commit message format is required for automated changelog generation. Examples:\n\n`
      ) +
      `    ${colors.green(`feat: add 'comments' option`)}\n` +
      `    ${colors.green(`fix: handle events on blur (close #28)`)}\n\n` +
      colors.red(`  See .github/commit-convention.md for more details.\n`)
  )
  process.exit(1)
}
