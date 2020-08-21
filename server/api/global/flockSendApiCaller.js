const needle = require('needle')

exports.flockSendApiCaller = (path, method, data) => {
  return needle(
    method,
    `https://flocksend.com/api/connect/official/v2/${path}`,
    data,
    { multipart: true }
  )
}
