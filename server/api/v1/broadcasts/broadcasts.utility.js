const needle = require('needle')

function isWhiteListedDomain (domain, pageId, user) {
  return new Promise(function (resolve, reject) {
    let returnValue = false
    needle.get(`https://graph.facebook.com/v2.10/${pageId}?fields=access_token&access_token=${user.facebookInfo.fbToken}`,
      (err, resp) => {
        if (err) {
          console.log('error in getting page access token', err)
        }
        needle.get(`https://graph.facebook.com/v2.10/me/messenger_profile?fields=whitelisted_domains&access_token=${resp.body.access_token}`,
          (err, resp) => {
            if (err) {
              console.log('error in getting whitelisted_domains', err)
            }
            console.log('domain', domain)
            console.log('reponse from whitelisted_domains', resp.body.data[0].whitelisted_domains)
            if (resp.body.data && resp.body.data[0].whitelisted_domains) {
              for (let i = 0; i < resp.body.data[0].whitelisted_domains.length; i++) {
                console.log('hostName of whitelist', getHostName(resp.body.data[0].whitelisted_domains[i]))
                console.log('hostName of domain', getHostName(domain))
                if (domain.includes(getHostName(resp.body.data[0].whitelisted_domains[i]))) {
                  returnValue = true
                }
                if (i === resp.body.data[0].whitelisted_domains.length - 1) {
                  console.log('returnValue', returnValue)
                  resolve({returnValue: returnValue})
                }
              }
            }
          })
      })
  })
}
function getHostName (url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i)
  if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
    return match[2]
  } else {
    return null
  }
}
exports.isWhiteListedDomain = isWhiteListedDomain
