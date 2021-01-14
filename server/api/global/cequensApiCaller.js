const needle = require('needle')

exports.cequensApiCaller = (path, clientName, number, method = 'get', token, data) => {
  let options = {
    headers: {
      'content_type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  return needle(
    method,
    `https://wabapi.cequens.net/${clientName}/${number}/v1/${path}`,
    data,
    options
  )
}
