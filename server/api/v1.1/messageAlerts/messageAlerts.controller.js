const logger = require('../../../components/logger')
const TAG = '/api/v1/messageAlerts/messageAlerts.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  let query = {
    purpose: 'findAll',
    match: {companyId: req.user.companyId, platform: req.body.platform}
  }
  callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in fetching alerts'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to fetch message alerts')
    })
}
exports.fetchSubscriptions = function (req, res) {
  let query = {
    purpose: 'findAll',
    match: {companyId: req.user.companyId, platform: req.body.platform}
  }
  callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in fetching subscriptions'
      logger.serverLog(message, `${TAG}: exports.fetchSubscriptions`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to fetch subscriptions')
    })
}
exports.saveAlert = function (req, res) {
  let query = {
    purpose: 'updateOne',
    match: {
      platform: req.body.platform,
      companyId: req.user.companyId,
      type: req.body.type
    },
    updated: {
      platform: req.body.platform,
      companyId: req.user.companyId,
      type: req.body.type,
      enabled: req.body.enabled,
      interval: req.body.interval,
      intervalUnit: req.body.intervalUnit,
      promptCriteria: req.body.promptCriteria
    },
    upsert: true
  }
  callApi(`alerts`, 'put', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data, 'saved successfully')
    })
    .catch(err => {
      const message = err || 'Error in saving alert'
      logger.serverLog(message, `${TAG}: exports.saveAlert`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to save message alert')
    })
}
exports.subscribe = function (req, res) {
  let query = {
    purpose: 'findOne',
    match: {companyId: req.user.companyId, platform: req.body.platform, alertChannel: req.body.channel, channelId: req.body.channelId}
  }
  callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscription => {
      if (subscription) {
        sendErrorResponse(res, 500, '', 'Subscription already Exists')
      } else {
        let payload = {
          companyId: req.user.companyId,
          platform: req.body.platform,
          alertChannel: req.body.channel,
          channelId: req.body.channelId,
          userName: req.body.name,
          profilePic: req.body.profilePic
        }
        callApi(`alerts/subscriptions`, 'post', payload, 'kibochat')
          .then(data => {
            sendSuccessResponse(res, 200, data, 'subscribed successfully')
          })
          .catch(err => {
            const message = err || 'Error in subscribe'
            logger.serverLog(message, `${TAG}: exports.subscribe`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, err, 'Failed to subscribe')
          })
      }
    })
    .catch(err => {
      const message = err || 'Error in fetching subscriptions'
      logger.serverLog(message, `${TAG}: exports.subscribe`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to subscribe')
    })
}
exports.unsubscribe = function (req, res) {
  callApi(`alerts/subscriptions`, 'delete', {
    purpose: 'deleteOne',
    match: {_id: req.params.id}
  }, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data, 'unsubscribed successfully')
    })
    .catch(err => {
      const message = err || 'Error in unsubscribe'
      logger.serverLog(message, `${TAG}: exports.unsubscribe`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to unsubscribe')
    })
}
