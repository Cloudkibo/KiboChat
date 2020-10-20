const utility = require('../utility')
const needle = require('needle')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { sendWebhook } = require('../../global/sendWebhook')

exports.index = function (req, res) {
  utility.callApi(`webhooks/query`, 'post', {companyId: req.user.companyId})
    .then(webhooks => {
      sendSuccessResponse(res, 200, webhooks)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch webhooks ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  utility.callApi(`webhooks/query`, 'post', {companyId: req.user.companyId, pageId: req.body.pageId})
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
                companyId: req.user.companyId,
                userId: req.user._id,
                isEnabled: true,
                optIn: req.body.optIn,
                pageId: req.body.pageId
              }
              utility.callApi(`webhooks`, 'post', webhookPayload)
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
      utility.callApi(`webhooks/${req.body._id}`, 'put', webhookPayload)
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
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled})
    .then(webhook => {
      sendSuccessResponse(res, 200, webhook)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
    })
}
exports.sendWebhook = function (req, res) {
  sendWebhook(req.body.type, req.body.platform, req.body.payload, req.body.page)
  sendSuccessResponse(res, 200, 'Webhook received successfully')
}
