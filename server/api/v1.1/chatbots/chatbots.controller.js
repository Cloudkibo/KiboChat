const logiclayer = require('./chatbots.logiclayer')
const datalayer = require('./chatbots.datalayer')
const msgBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi(`pages/query`, 'post', {companyId: req.user.companyId, connected: true})
    .then(pages => {
      let pageIds = logiclayer.prepareIdsArray(pages)
      datalayer.findAllChatBots({pageId: { $in: pageIds }})
        .then(chatbots => {
          logiclayer.populatePageIdsInChatBots(pages, chatbots)
          return sendSuccessResponse(res, 200, chatbots, null)
        })
        .catch(error => {
          return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbots.')
        })
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch the pages.')
    })
}

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.createForChatBot(payload)
    .then(chatbot => {
      _sendToClientUsingSocket(chatbot)
      return sendSuccessResponse(res, 201, chatbot, null)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to create the chatbot.')
    })
}

exports.update = function (req, res) {
  let dataToUpdate = { published: req.body.published }
  datalayer.genericUpdateChatBot({_id: req.body.chatbotId}, dataToUpdate)
    .then(chatbotUpdated => {
      return sendSuccessResponse(res, 200, chatbotUpdated, 'Updated the chatbot publish status')
    })
    .catch(error => {
      sendErrorResponse(res, 500, error, `Failed to update chatbot ${JSON.stringify(error)}`)
    })
}

exports.details = function (req, res) {
  msgBlockDataLayer.findAllMessageBlock({ 'module.type': 'chatbot', 'module.id': req.params.id })
    .then(messageBlocks => {
      return sendSuccessResponse(res, 200, messageBlocks, null)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbot details.')
    })
}

function _sendToClientUsingSocket (body) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'chatbots_newCreated',
      payload: {
        chatbot: body
      }
    }
  })
}

// exports.delete = function (req, res) {
//   datalayer.deleteForChatBot({ _id: req.params.id })
//     .then(chatbot => {
//       return res.status(201).json({ status: 'success', payload: chatbot })
//     })
//     .catch(error => {
//       return res.status(500).json({ status: 'failed', payload: `Failed to delete chatbot ${error}` })
//     })
// }
