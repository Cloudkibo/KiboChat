const needle = require('needle')

exports.cequensApiCaller = (path, method = 'get', token, data) => {
  let options = {
    headers: {
      'content_type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  return needle(
    method,
    `https://apis.cequens.com/conversation/wab/v1/${path}`,
    // `https://wabapi.cequens.net/${clientName}/${number}/v1/${path}`,
    data,
    options
  )
}
