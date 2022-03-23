<template>
  <div id="app">
    <h1>file-upload</h1>
    <div>
      <input type="file" @change="handleFileChange" />
      <el-button @click="handleUpload">上传</el-button>
      <el-button @click="handlePause">暂停</el-button>
      <el-button @click="handleResume">恢复</el-button>
      <div v-if="filename">
        <h2>计算hash总进度：</h2>
        <div>
          <span>{{ filename }}</span>
          <el-progress :percentage="hashPercentage"></el-progress>
        </div>
        <h2>上传总进度：</h2>
        <div>
          <span>{{ filename }}</span>
          <el-progress :percentage="uploadPercentage"></el-progress>
        </div>
        <div v-for="item in data" :key="item.hash">
          <h2>切片上传进度：</h2>
          <div>
            <span>{{ item.hash }}：</span>
            <span>大小： {{ parseInt(item.size / 1024).toFixed(2) }} KB</span>
            <el-progress :percentage="item.percentage"></el-progress>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { request, createFileChunk, createProgressHandler } from './utils'
// 切片大小
const SIZE = 1 * 1024 * 1024
export default {
  name: 'App',
  data() {
    return {
      container: {
        file: null,
        hash: '',
        worker: null
      },
      data: [],
      requestList: [],
      hashPercentage: 0,
      fakeUploadPercentage: 0
    }
  },
  computed: {
    filename({ container }) {
      const { file } = container || {}
      return file?.name || ''
    },
    uploadPercentage({ data, container }) {
      if (!container.file || !data.length) return 0
      const loaded = data
        .map((item) => item.size * item.percentage)
        .reduce((acc, cur) => acc + cur)
      return parseInt((loaded / container.file.size).toFixed(2))
    }
  },
  watch: {
    uploadPercentage(now) {
      if (now > this.fakeUploadPercentage) {
        this.fakeUploadPercentage = now
      }
    }
  },
  methods: {
    handleFileChange(e) {
      console.log('handleFileChange', e)
      const [file] = e.target.files
      this.container.file = file
    },
    handlePause() {
      this.requestList.forEach((xhr) => xhr?.abort())
      this.requestList = []
    },
    async handleResume() {
      const { uploadedList } = await this.verifyUpload(
        this.container.file.name,
        this.container.hash
      )
      await this.uploadChunks(uploadedList)
    },
    async handleUpload() {
      console.log('handleUpload: ')
      if (!this.container.file) return
      const size = SIZE
      const fileChunkList = createFileChunk(this.container.file, size)
      this.container.hash = await this.calculateHash(fileChunkList)

      const { shouldUpload, uploadedList = [] } = await this.verifyUpload(
        this.container.file.name,
        this.container.hash
      )

      if (!shouldUpload) {
        this.$message.success('秒传：上传成功')
        return
      }
      this.data = fileChunkList.map(({ file }, index) => {
        return {
          fileHash: this.container.hash,
          chunk: file,
          hash: `${this.container.hash}-${index}`,
          percentage: uploadedList.includes(index) ? 100 : 0,
          size: file.size
        }
      })
      await this.uploadChunks(uploadedList)
    },
    // 上传切片，同时过滤已上传的切片
    async uploadChunks(uploadedList = []) {
      const requestList = this.data
        .filter(({ hash }) => !uploadedList.includes(hash))
        .map(({ chunk, hash, index }) => {
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', this.container.file.name)
          formData.append('fileHash', this.container.hash)
          return { formData, index }
        })
        .map(async ({ formData, index }) =>
          request({
            url: 'http://localhost:4000',
            data: formData,
            onProgress: createProgressHandler(this.data[index]),
            requestList: this.requestList
          })
        )
      await Promise.all(requestList)
      // 之前上传的切片数量 + 本次上传的切片数量 = 所有切片数量时
      // 合并切片
      if (uploadedList.length + requestList.length === this.data.length) {
        await this.mergeRequest()
      }
    },
    async mergeRequest() {
      const { file, hash } = this.container || {}
      await request({
        url: 'http://localhost:4000/merge',
        data: JSON.stringify({
          fileHash: hash,
          filename: file.name,
          size: SIZE
        }),
        headers: {
          'content-type': 'application/json'
        }
      })
    },
    calculateHash(fileChunkList) {
      return new Promise((resolve) => {
        if (window.Worker) {
          this.container.worker = new Worker('/hash.js')
          this.container.worker.postMessage({ fileChunkList })
          this.container.worker.onmessage = (e) => {
            console.log('this.container.worker: ', e)
            const { percentage, hash } = e.data
            this.hashPercentage = percentage
            if (hash) {
              resolve(hash)
            }
          }
        }
      })
    },
    // 根据 hash 验证文件是否曾经已经被上传过
    // 没有才进行上传
    async verifyUpload(filename, fileHash) {
      const { data } = await request({
        url: 'http://localhost:4000/verify',
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          filename,
          fileHash
        })
      })
      return JSON.parse(data)
    }
  }
}
</script>
