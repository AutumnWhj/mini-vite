/* eslint-disable no-undef */

export function request({
  url,
  method = 'post',
  data,
  headers = {},
  onProgress = (e) => e,
  requestList = []
}) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()

    xhr.addEventListener('progress', onProgress)
    xhr.open(method, url)

    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key])
    })
    xhr.send(data)
    xhr.onload = (e) => {
      console.log('onload--e: ', e)
      if (requestList.length > 0) {
        const xhrIndex = requestList.findIndex((item) => item === xhr)
        requestList.splice(xhrIndex, 1)
      }
      resolve({
        data: e.target.response
      })
    }
    requestList.push(xhr)
  })
}
export function createProgressHandler(item) {
  return (e) => {
    item.percentage = parseInt(String((e.loaded / e.total) * 100))
  }
}

export function createFileChunk(file, size) {
  const fileListChunk = []
  let cur = 0
  while (cur < file.size) {
    fileListChunk.push({
      file: file.slice(cur, cur + size)
    })
    cur += size
  }
  return fileListChunk
}
