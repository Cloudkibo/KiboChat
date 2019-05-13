const utility = require('../utility')
const needle = require('needle')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      if (!companyuser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`webhooks/query`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch company user
        .then(webhooks => {
          return res.status(201).json({status: 'success', payload: webhooks})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch webhooks ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`webhooks/query`, 'post', {companyId: companyUser.companyId, pageId: req.body.pageId}, req.headers.authorization) // fetch company user
        .then(webhooks => {
          if (webhooks && webhooks.length > 0) {
            return res.status(403).json({status: 'failed', description: 'Webhook for this page is already set'})
          } else {
            var url = req.body.webhook_url + '?token=' + req.body.token
            needle.get(url, (err, r) => {
              if (err) {
                console.log('error', err)
                return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
              } else {
                if (r.statusCode === 200) {
                  let webhookPayload = {
                    webhook_url: req.body.webhook_url,
                    companyId: companyUser.companyId,
                    userId: req.user._id,
                    isEnabled: true,
                    optIn: req.body.optIn,
                    pageId: req.body.pageId
                  }
                  utility.callApi(`webhooks`, 'post', webhookPayload, req.headers.authorization) // fetch company user
                    .then(webhook => {
                      return res.status(201).json({status: 'success', payload: webhook})
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to save webhook ${JSON.stringify(error)}`
                      })
                    })
                } else {
                  return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
                }
              }
            })
          }
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch webhook ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.edit = function (req, res) {
  var url = req.body.webhook_url + '?token=' + req.body.token
  needle.get(url, (err, r) => {
    if (err) {
      return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
    } else if (r.statusCode === 200) {
      let webhookPayload = {
        webhook_url: req.body.webhook_url,
        optIn: req.body.optIn
      }
      utility.callApi(`webhooks/${req.body._id}`, 'put', webhookPayload, req.headers.authorization) // fetch company user
        .then(webhook => {
          res.status(201).json({status: 'success', payload: webhook})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to update webhook ${JSON.stringify(error)}`
          })
        })
    } else {
      return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
    }
  })
}
exports.enabled = function (req, res) {
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled}, req.headers.authorization) // fetch company user
    .then(webhook => {
      res.status(201).json({status: 'success', payload: webhook})
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update webhook ${JSON.stringify(error)}`
      })
    })
}
