<template>
  <div id="app">
    <h1>file-upload</h1>
    <div>
      <input type="file" @change="handleFileChange" />
      <el-button @click="handleUpload">上传</el-button>
    </div>
  </div>
</template>
<script>
import { request, createFileChunk } from './utils'
// 切片大小
const SIZE = 5 * 1024 * 1024
export default {
  name: 'App',
  data() {
    return {
      container: {
        file: null
      },
      data: []
    }
  },
  computed: {
    fileData({ data, container }) {
      const { file } = container || {}
      return data.map(({ chunk, hash }) => {
        const formData = new FormData()
        formData.append('chunk', chunk)
        formData.append('hash', hash)
        formData.append('filename', file.name)
        return {
          formData
        }
      })
    }
  },
  methods: {
    handleFileChange(e) {
      console.log('handleFileChange', e)
      const [file] = e.target.files
      this.container.file = file
    },
    async handleUpload() {
      console.log('handleUpload: ')
      if (!this.container.file) return
      const size = SIZE
      const fileChunkList = createFileChunk(this.container.file, size)
      this.data = fileChunkList.map(({ file }, index) => {
        return {
          chunk: file,
          hash: `${this.container.file.name}-${index}`
        }
      })
      // console.log('fileChunkList: ', fileChunkList)
      await this.uploadChunks()
    },
    async uploadChunks() {
      const requestList = this.fileData.map(({ formData }) => {
        request({
          url: 'http://localhost:4000',
          data: formData
        })
      })
      await Promise.all(requestList)
      await this.mergeRequest()
    },
    async mergeRequest() {
      const { file } = this.container || {}
      const { name: filename } = file || {}
      await request({
        url: 'http://localhost:4000/merge',
        data: JSON.stringify({ filename, size: SIZE }),
        headers: {
          'content-type': 'application/json'
        }
      })
    }
  }
}
</script>
