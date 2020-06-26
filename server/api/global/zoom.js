const needle = require('needle')
const config = require('../../config/environment')

exports.zoomApiCaller = (method, path, data, auth, qs) => {
  let authorization = ''
  if (auth.type === 'basic') {
    authorization = `Basic ${Buffer.from(config.zoomClientId + ':' + config.zoomClientSecret).toString('base64')}`
  } else if (auth.type === 'bearer') {
    authorization = `Bearer ${auth.token}`
  }
  const options = {
    json: !qs,
    headers: {
      'Authorization': authorization
    }
  }
  return new Promise((resolve, reject) => {
    needle.request(
      method.toUpperCase(),
      `https://api.zoom.us/${path}`,
      data,
      options,
      (err, response) => {
        if (err) {
          reject(err)
        } else {
          resolve(response.body)
        }
      }
    )
  })
}
