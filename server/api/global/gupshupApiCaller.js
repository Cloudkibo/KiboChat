const needle = require('needle')

exports.gupshupApiCaller = (path, method = 'get', token, data) => {
  let options = {
    headers: {
      content_type: 'application/x-www-form-urlencoded',
      'apiKey': token
    }
  }
  return needle(
    method,
    `https://api.gupshup.io/sm/api/v1/${path}`,
    data,
    options
  )
}
