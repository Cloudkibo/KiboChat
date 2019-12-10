const logger = require('../../../components/logger')
const TAG = 'api/smart_replies/bots.controller.js'
const dataLayer = require('./datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of intents is hit', 'debug')
  dataLayer.findAllIntents({botId: req.body.botId})
    .then(intents => {
      sendSuccessResponse(res, 200, intents)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching intent ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating intent')
    })
}

exports.create = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of intents is hit', 'debug')
  dataLayer.findOneIntent({name: req.body.name})
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
        dataLayer.createIntent(data)
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
  dataLayer.updateOneIntent({_id: req.body.intentId}, {name: req.body.name})
    .then(updatedObj => {
      sendSuccessResponse(res, 200, 'Intent updated successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while updating intent ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating intent')
    })
}
