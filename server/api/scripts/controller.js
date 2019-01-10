const utility = require('../v1.1/utility')
let config = require('../../config/environment')

exports.addWhitelistDomain = function (req, res) {
  utility.callApi(`pages/query`, 'post', {connected: true}, req.headers.authorization) // fetch connected pages
    .then(pages => {
      for (let i = 0; i < pages.length; i++) {
        utility.callApi(`pages/whitelistDomain`, 'post', {page_id: pages[i].pageId, whitelistDomains: [`${config.domain}`]}, req.headers.authorization)
          .then(whitelistDomains => {
            return res.status(200).json({
              status: 'success',
              payload: whitelistDomains
            })
          })
          .catch(error => {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to save whitelist domains ${JSON.stringify(error)}`
            })
          })
      }
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
      })
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}
