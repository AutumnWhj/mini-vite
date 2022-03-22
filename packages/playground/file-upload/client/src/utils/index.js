/* eslint-disable no-undef */

export function request({
  url,
  method = 'post',
  data,
  headers = {},
  requestList
}) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)

    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key])
    })
    xhr.send(data)
    xhr.onload = (e) => {
      console.log('onload--e: ', e)
      resolve({
        data: e.target.response
      })
    }
  })
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
