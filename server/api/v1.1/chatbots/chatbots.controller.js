const logiclayer = require('./chatbots.logiclayer')
const datalayer = require('./chatbots.datalayer')
const { callApi } = require('../utility')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  let chatbots = []
  callApi(`pages/query`, 'post', {companyId: req.user.companyId, connected: true})
    .then(pages => {
      async.each(pages, (page, callback) => {
        datalayer.findOneChatBot({pageId: page._id})
          .then(chatbot => {
            if (chatbot) {
              chatbot.pageId = page
              chatbots.push(chatbot)
            }
            callback()
          })
          .catch(error => {
            callback(error)
          })
      }, function (error) {
        if (error) {
          return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbots.')
        } else {
          return sendSuccessResponse(res, 200, chatbots, null)
        }
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

// exports.update = function (req, res) {
//   let dataToUpdate = req.body
//   datalayer.genericUpdateChatBot({_id: req.params.id}, dataToUpdate)
//     .then(sponsoredMessage => {
//       return res.status(201).json({ status: 'success', payload: sponsoredMessage })
//     })
//     .catch(error => {
//       return res.status(500).json({ status: 'failed', payload: `Failed to update chatbot ${JSON.stringify(error)}` })
//     })
// }

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
