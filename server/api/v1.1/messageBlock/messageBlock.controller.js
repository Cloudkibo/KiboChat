const logiclayer = require('./messageBlock.logiclayer')
const datalayer = require('./messageBlock.datalayer')
const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messageBlock/messageBlock.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.genericUpdateMessageBlock({uniqueId: req.body.uniqueId}, payload, {upsert: true})
    .then(messageBlock => {
      _sendToClientUsingSocket(messageBlock)
      if (req.body.triggers) {
        let updatePayload = { triggers: req.body.triggers }
        if (messageBlock.upserted) updatePayload.startingBlockId = messageBlock.upserted[0]._id
        chatbotDataLayer.genericUpdateChatBot(
          { _id: req.body.chatbotId }, updatePayload)
          .then(updated => logger.serverLog(TAG, `chatbot updated for triggers ${JSON.stringify(updated)}`))
          .catch(error => logger.serverLog(TAG, `error in chatbot update for triggers ${JSON.stringify(error)}`))
      }
      return sendSuccessResponse(res, 201, messageBlock, 'Created or updated successfully')
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to create the message block.')
    })
}

function _sendToClientUsingSocket (body) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'chatbot_messageBlock_newCreated',
      payload: {
        chatbot: body
      }
    }
  })
}

exports.delete = function (req, res) {
  datalayer.deleteForMessageBlock({ _id: req.params.id })
    .then(messageBlock => {
      return res.status(201).json({ status: 'success', payload: messageBlock })
    })
    .catch(error => {
      return res.status(500).json({ status: 'failed', payload: `Failed to delete messageBlock ${error}` })
    })
}
