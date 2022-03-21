const http = require('http')

http
  .createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Hello world\n')
  })
  .listen(1337, '127.0.0.1')
console.log('Server run at: http://127.0.0.1:1337/')
