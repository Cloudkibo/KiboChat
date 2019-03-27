const needle = require('needle')

exports.facebookApiCaller = (version, path, method, data) => {
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data
  )
}
