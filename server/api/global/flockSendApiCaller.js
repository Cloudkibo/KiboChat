const needle = require('needle')

exports.flockSendApiCaller = (path, method, data) => {
  return needle(
    method,
    `https://flocksend.com/api/${path}`,
    data,
    { multipart: true }
  )
}
