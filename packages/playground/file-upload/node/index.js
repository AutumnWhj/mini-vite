const http = require('http')
const path = require('path')
const multiparty = require('multiparty')
const fse = require('fs-extra')
const server = http.createServer()
// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, '.', 'target')

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.status = 200
    res.end()
  }
  // multiparty 把传过来的FormData--保存到文件
  const multiForm = new multiparty.Form()
  // files 参数保存了 FormData 中文件，
  // fields 参数保存了 FormData 中非文件的字段
  multiForm.parse(req, async (err, fields, files) => {
    if (err) return
    const [chunk] = files.chunk
    const [hash] = fields.hash
    const [filename] = fields.filename
    const chunkDir = path.resolve(UPLOAD_DIR)
    const filePath = `${chunkDir}/${hash}`
    // 文件存在直接返回
    if (fse.existsSync(filePath)) {
      res.end('file exist')
      return
    }
    // 文件夹不存在则新建

    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir)
    }
    // 写入
    await fse.move(chunk.path, filePath)
    res.end('received file chunk')
  })

  // 合并大文件
  if (req.url === '/merge') {
    // 解析传入的参数
    const data = await resolvePost(req)
    const { filename, size } = data || {}
    const filePath = path.resolve(UPLOAD_DIR, `${filename}`)
    // 合并
    await mergeFileChunk({ filePath, filename, size })
    // 合并成功返回 成功消息
    res.end(
      JSON.stringify({
        code: 0,
        message: 'file merged success'
      })
    )
  }
})

function resolvePost(req) {
  return new Promise((resolve) => {
    let chunk = ''
    req.on('data', (data) => {
      chunk += data
    })
    req.on('end', () => {
      if (chunk) {
        resolve(JSON.parse(chunk))
      }
    })
  })
}
function pipeStream(path, writeStream) {
  return new Promise((resolve) => {
    const readStream = fse.createReadStream(path)
    readStream.on('open', function () {
      readStream.pipe(writeStream)
    })
    readStream.on('end', () => {
      fse.unlinkSync(path)
      resolve()
    })
  })
}

async function mergeFileChunk({ filePath, filename, size }) {
  const chunkDir = path.resolve(UPLOAD_DIR)
  const chunkPaths = await fse.readdir(chunkDir)
  // 根据切片下标排序，确保合并正确
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])

  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        fse.createWriteStream(filePath, {
          start: (index + 1) * size
        })
      )
    )
  )
}

server.listen('4000', () => {})
