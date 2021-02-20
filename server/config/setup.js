const http = require('http')
const https = require('https')
const fs = require('fs')
const TAG = 'config/setup.js'

module.exports = function (app, httpapp, config) {
  let options = {
    ca: '',
    key: '',
    cert: ''
  }

  if (['production', 'staging'].indexOf(config.env) > -1) {
    try {
      options = {
        ca: fs.readFileSync('/root/certs/kibochat.ca-bundle'),
        key: fs.readFileSync('/root/certs/kibochat.key'),
        cert: fs.readFileSync('/root/certs/kibochat.crt')
      }
    } catch (e) {
      console.log(e)
    }
  }

  const server = http.createServer(httpapp)
  const httpsServer = https.createServer(options, app)

  if (['production', 'staging'].indexOf(config.env) > -1) {
    httpapp.get('*', (req, res) => {
      res.redirect(`${config.domain}${req.url}`)
    })
  }

  const socket = require('socket.io').listen(
    (config.env === 'production' || config.env === 'staging') ? httpsServer
      : server)

  require('./socketio').setup(socket)

  server.listen(config.port, () => {
    console.log(TAG, `Project server STARTED on ${
      config.port} in ${config.env} modes`)
  })

  httpsServer.listen(config.secure_port, () => {
    console.log(TAG, `Project server STARTED on ${
      config.secure_port} in ${config.env} mode`)
  })

  if (config.env === 'production') {
    console.log('Project server STARTED on %s in %s mode', config.port, config.env)
  } else {
    console.log('started in other mode')
  }
}
