const logger = require('../../../components/logger')
const logicLayer = require('./messageAlerts.logiclayer')
const TAG = '/api/v1/messageAlerts/messageAlerts.controller.js'
const { callApi } = require('../utility')
const async = require('async')
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
      const message = err || 'Error in updating alert'
      logger.serverLog(message, `${TAG}: exports.saveAlert`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Failed to update message alert')
    })
}
