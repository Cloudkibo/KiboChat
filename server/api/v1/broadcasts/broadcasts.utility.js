const needle = require('needle')
const fs = require('fs')
const path = require('path')
const logger = require('../../../components/logger')
function isWhiteListedDomain (domain, pageId, user) {
  return new Promise(function (resolve, reject) {
    let returnValue = false
    needle.get(`https://graph.facebook.com/v6.0/${pageId}?fields=access_token&access_token=${user.facebookInfo.fbToken}`,
      (err, resp) => {
        if (err) {
        }
        needle.get(`https://graph.facebook.com/v6.0/me/messenger_profile?fields=whitelisted_domains&access_token=${resp.body.access_token}`,
          (err, resp) => {
            if (err) {
            }
            if (resp.body.data && resp.body.data.length != 0 && resp.body.data[0].whitelisted_domains) {
              for (let i = 0; i < resp.body.data[0].whitelisted_domains.length; i++) {
                if (domain.includes(getHostName(resp.body.data[0].whitelisted_domains[i]))) {
                  returnValue = true
                }
                if (i === resp.body.data[0].whitelisted_domains.length - 1) {
                  resolve({returnValue: returnValue})
                }
              }
            } else {
              resolve({returnValue: returnValue})
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

function deleteFile (id) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
  // unlink file
  fs.unlink(dir + '/userfiles/' + id, function (err) {
    if (err) {
      logger.serverLog(err, 'error')
    } else {
      logger.serverLog('file deleted successfully')
    }
  })
}
exports.isWhiteListedDomain = isWhiteListedDomain
exports.deleteFile = deleteFile