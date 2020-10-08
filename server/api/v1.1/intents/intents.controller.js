const logger = require('../../../components/logger')
const TAG = 'api/smart_replies/bots.controller.js'
const dataLayer = require('./datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { callGoogleApi } = require('../../global/googleApiCaller')

exports.index = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of intents is hit', 'debug')
  dataLayer.findAllIntents({ botId: req.body.botId })
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
  dataLayer.findOneIntent({ name: req.body.name })
    .then(intent => {
      if (intent) {
        sendErrorResponse(res, 403, 'Intent with this name already exists')
      } else {
        const data = {
          name: req.body.name,
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
  dataLayer.updateOneIntent({ _id: req.body.intentId }, { name: req.body.name })
    .then(updatedObj => {
      sendSuccessResponse(res, 200, 'Intent updated successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while updating intent ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating intent')
    })
}

exports.delete = function (req, res) {
  logger.serverLog(TAG, 'delete endpoint of intents is hit', 'debug')
  if (!req.body.dialogflowIntentId) {
    dataLayer.deleteOneIntent({ _id: req.body.intentId })
      .then(deletedObj => {
        sendSuccessResponse(res, 200, 'Intent deleted successfully!')
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
        sendErrorResponse(res, 500, 'Failed to delete intent.')
      })
  } else {
    _deleteDialogFlowIntent(req.body)
      .then(deleted => {
        dataLayer.deleteOneIntent({ _id: req.body.intentId })
          .then(deletedObj => {
            sendSuccessResponse(res, 200, 'Intent deleted successfully!')
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 500, 'Failed to delete intent.')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, `Error occured while deleting intent ${err}`, 'error')
        sendErrorResponse(res, 500, 'Error occured while deleting intent')
      })
  }
}

const _deleteDialogFlowIntent = (data) => {
  return callGoogleApi(
    `https://dialogflow.googleapis.com/v2/projects/${data.gcpPojectId.toLowerCase()}/agent/intents/${data.dialogflowIntentId}`,
    'DELETE'
  )
}
