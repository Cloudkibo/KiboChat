const utility = require('../v1.1/utility')
let config = require('../../config/environment')
const needle = require('needle')

exports.addWhitelistDomain = function (req, res) {
  utility.callApi(`pages/query`, 'post', {connected: true}) // fetch connected pages
    .then(pages => {
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].userId && pages[i].userId._id) {
          utility.callApi(`user/query`, 'post', {_id: pages[i].userId._id})
            .then(connectedUser => {
              connectedUser = connectedUser[0]
              if (connectedUser.facebookInfo) {
                needle.get(`https://graph.facebook.com/v6.0/${pages[i].pageId}?fields=access_token&access_token=${connectedUser.facebookInfo.fbToken}`,
                  (err, resp) => {
                    if (err) {
                    }
                    var accessToken = resp.body.access_token
                    needle.get(`https://graph.facebook.com/v6.0/me/messenger_profile?fields=whitelisted_domains&access_token=${accessToken}`, function (err, resp) {
                      if (err) {
                      }
                      var body = JSON.parse(JSON.stringify(resp.body))
                      let temp = []
                      if (body.data && body.data.length > 0 && body.data[0].whitelisted_domains) {
                        temp = body.data[0].whitelisted_domains
                      }
                      temp.push(`${config.domain}`)
                      let whitelistedDomains = {
                        whitelisted_domains: temp
                      }
                      let requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${accessToken}`
                      needle.request('post', requesturl, whitelistedDomains, {json: true}, function (err, resp) {
                        if (err) {
                        }
                      })
                    })
                  })
              }
            })
            .catch(error => {
              if (error) {
              }
            })
        }
      }
    })
    .catch(error => {
      if (error) {
      }
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}
