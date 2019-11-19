const logger = require('../../../components/logger')
const TAG = 'api/smart_replies/bots.controller.js'
const { callApi } = require('../utility')
// const logicLayer = require('./logicLayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
// const { callGoogleApi } = require('../../global/googleApiCaller')
// const config = require('../../../config/environment')
// const async = require('async')

exports.create = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of intents is hit', 'debug')
  callApi('intents/query', 'POST', {purpose: 'findOne', match: {name: req.body.name}}, 'kibochat')
    .then(intent => {
      if (intent) {
        sendErrorResponse(res, 403, 'Intent with this name already exists')
      } else {
        const data = {
          name: req.body.name,
          dialogFlowIntentId: '',
          questions: [],
          answer: [],
          botId: req.body.botId
        }
        callApi('intents', 'POST', data, 'kibochat')
          .then(createdObj => {
            sendSuccessResponse(res, 200, 'Intent created succssfully!')
          })
          .catch(err => {
            logger.serverLog(TAG, `Error occured while creating intent ${err}`, 'error')
            sendErrorResponse(res, 500, 'Error occured while creating intent')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching intent ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating intent')
    })
}

exports.update = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of intents is hit', 'debug')
  callApi('intents', 'PUT', {purpose: 'updateOne', match: {_id: req.body.intentId}, updated: {name: req.body.name}}, 'kibochat')
    .then(updatedObj => {
      sendSuccessResponse(res, 200, 'Intent updated successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while updating intent ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating intent')
    })
}
