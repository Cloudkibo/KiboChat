const utility = require('../utility')
const needle = require('needle')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { sendWebhook } = require('../../global/sendWebhook')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/verificationtoken/verificationtoken.controller.js'

exports.index = function (req, res) {
  utility.callApi(`webhooks/query`, 'post', {companyId: req.user.companyId})
    .then(webhooks => {
      sendSuccessResponse(res, 200, webhooks)
    })
    .catch(error => {
      const message = error || 'Failed to fetch webhooks'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
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
            let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
            sendErrorResponse(res, 400, errorMsg)
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
                  const message = error || 'Failed to fetch webhooks'
                  logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to save webhook ${JSON.stringify(error)}`)
                })
            } else {
              let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
              sendErrorResponse(res, 400, '', errorMsg)
            }
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch webhooks'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch webhook ${JSON.stringify(error)}`)
    })
}
exports.edit = function (req, res) {
  var url = req.body.webhook_url + '?token=' + req.body.token
  needle.get(url, (err, r) => {
    if (err) {
      let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
      sendErrorResponse(res, 500, '', errorMsg)
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
          const message = error || 'Failed to update webhooks'
          logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
        })
    } else {
      let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
      sendErrorResponse(res, 400, '', errorMsg)
    }
  })
}
exports.enabled = function (req, res) {
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled})
    .then(webhook => {
      sendSuccessResponse(res, 200, webhook)
    })
    .catch(error => {
      const message = error || 'Failed to update webhooks'
      logger.serverLog(message, `${TAG}: exports.enabled`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
    })
}
exports.sendWebhook = function (req, res) {
  sendWebhook(req.body.type, req.body.platform, req.body.payload, req.body.page)
  sendSuccessResponse(res, 200, 'Webhook received successfully')
}
