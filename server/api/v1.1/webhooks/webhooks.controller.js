const utility = require('../utility')
const needle = require('needle')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      if (!companyuser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`webhooks/query`, 'post', {companyId: companyuser.companyId}) // fetch company user
        .then(webhooks => {
          sendSuccessResponse(res, 200, webhooks)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch webhooks ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`webhooks/query`, 'post', {companyId: companyUser.companyId, pageId: req.body.pageId}) // fetch company user
        .then(webhooks => {
          if (webhooks && webhooks.length > 0) {
            sendErrorResponse(res, 403, 'Webhook for this page is already set')
          } else {
            var url = req.body.webhook_url + '?token=' + req.body.token
            needle.get(url, (err, r) => {
              if (err) {
                sendErrorResponse(res, 400, 'This URL contains an invalid domain or the server at the given URL is not live.')
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
                  utility.callApi(`webhooks`, 'post', webhookPayload) // fetch company user
                    .then(webhook => {
                      sendSuccessResponse(res, 200, webhook)
                    })
                    .catch(error => {
                      sendErrorResponse(res, 500, `Failed to save webhook ${JSON.stringify(error)}`)
                    })
                } else {
                  sendErrorResponse(res, 400, '', 'This URL contains an invalid domain or the server at the given URL is not live.')
                }
              }
            })
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch webhook ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.edit = function (req, res) {
  var url = req.body.webhook_url + '?token=' + req.body.token
  needle.get(url, (err, r) => {
    if (err) {
      sendErrorResponse(res, 500, '', 'This URL contains an invalid domain or the server at the given URL is not live.')
    } else if (r.statusCode === 200) {
      let webhookPayload = {
        webhook_url: req.body.webhook_url,
        optIn: req.body.optIn
      }
      utility.callApi(`webhooks/${req.body._id}`, 'put', webhookPayload) // fetch company user
        .then(webhook => {
          sendSuccessResponse(res, 200, webhook)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
        })
    } else {
      sendErrorResponse(res, 400, '', 'This URL contains an invalid domain or the server at the given URL is not live.')
    }
  })
}
exports.enabled = function (req, res) {
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled}) // fetch company user
    .then(webhook => {
      sendSuccessResponse(res, 200, webhook)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
    })
}
