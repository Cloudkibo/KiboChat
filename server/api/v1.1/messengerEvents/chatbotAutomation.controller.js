const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const messageBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const { intervalForEach } = require('./../../../components/utility')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const TAG = 'api/v1/messengerEvents/chatbotAutomation.controller'

exports.handleChatBotWelcomeMessage = (req, page, subscriber) => {
  chatbotDataLayer.findOneChatBot({pageId: page._id, published: true})
    .then(chatbot => {
      if (chatbot) {
        chatbot.triggers = chatbot.triggers.map(item => item.toLowerCase().trim())
        if ((req.message && chatbot.triggers.indexOf(req.message.text.toLowerCase().trim()) > -1) ||
        (req.postback && req.postback.payload)) {
          if (chatbot.startingBlockId) {
            messageBlockDataLayer.findOneMessageBlock({ _id: chatbot.startingBlockId })
              .then(messageBlock => {
                if (messageBlock) {
                  senderAction(req.sender.id, 'typing_on', page.accessToken)
                  intervalForEach(messageBlock.payload, (item) => {
                    sendResponse(req.sender.id, item, subscriber, page.accessToken)
                    senderAction(req.sender.id, 'typing_off', page.accessToken)
                  }, 1500)
                }
              })
              .catch(error => {
                logger.serverLog(TAG,
                  `error in fetching message block ${JSON.stringify(error)}`, 'error')
              })
          } else {
            logger.serverLog(TAG,
              `DATA INCONSISTENCY ERROR in following chatbot, no startingBlockId given ${JSON.stringify(chatbot)}`, 'error')
          }
        } else if (chatbot.fallbackReplyEnabled) {
          sendFallbackReply(req.sender.id, page, chatbot.fallbackReply, subscriber)
        }
      }
    })
    .catch(error => {
      logger.serverLog(TAG,
        `error in fetching chatbot ${JSON.stringify(error)}`, 'error')
    })
}

exports.handleChatBotNextMessage = (req, page, subscriber, uniqueId) => {
  chatbotDataLayer.findOneChatBot({pageId: page._id, published: true})
    .then(chatbot => {
      if (chatbot) {
        messageBlockDataLayer.findOneMessageBlock({ uniqueId: uniqueId.toString() })
          .then(messageBlock => {
            if (messageBlock) {
              senderAction(req.sender.id, 'typing_on', page.accessToken)
              intervalForEach(messageBlock.payload, (item) => {
                sendResponse(req.sender.id, item, subscriber, page.accessToken)
                senderAction(req.sender.id, 'typing_off', page.accessToken)
              }, 1500)
            }
          })
          .catch(error => {
            logger.serverLog(TAG,
              `error in fetching message block ${JSON.stringify(error)}`, 'error')
          })
      }
    })
    .catch(error => {
      logger.serverLog(TAG,
        `error in fetching chatbot ${JSON.stringify(error)}`, 'error')
    })
}

exports.handleChatBotTestMessage = (req, page, subscriber) => {
  chatbotDataLayer.findOneChatBot({pageId: page._id})
    .then(chatbot => {
      if (chatbot) {
        messageBlockDataLayer.findOneMessageBlock({ _id: chatbot.startingBlockId })
          .then(messageBlock => {
            if (messageBlock) {
              _sendToClientUsingSocket(chatbot)
              senderAction(req.sender.id, 'typing_on', page.accessToken)
              intervalForEach(messageBlock.payload, (item) => {
                sendResponse(req.sender.id, item, subscriber, page.accessToken)
                senderAction(req.sender.id, 'typing_off', page.accessToken)
              }, 1500)
            }
          })
          .catch(error => {
            logger.serverLog(TAG,
              `error in fetching message block ${JSON.stringify(error)}`, 'error')
          })
      }
    })
    .catch(error => {
      logger.serverLog(TAG,
        `error in fetching chatbot ${JSON.stringify(error)}`, 'error')
    })
}

function sendResponse (recipientId, payload, subscriber, accessToken) {
  let finalPayload = logicLayer.prepareSendAPIPayload(recipientId, payload, subscriber.firstName, subscriber.lastName, true)
  facebookApiCaller('v3.2', `me/messages?access_token=${accessToken}`, 'post', finalPayload)
    .then(response => {
      logger.serverLog(TAG, `response of sending block ${JSON.stringify(response.body)}`)
    })
    .catch(error => {
      return logger.serverLog(TAG,
        `error in sending message ${JSON.stringify(error)}`, 'error')
    })
}

function senderAction (recipientId, action, accessToken) {
  let payload = {
    recipient: {
      id: recipientId
    },
    sender_action: action
  }
  facebookApiCaller('v3.2', `me/messages?access_token=${accessToken}`, 'post', payload)
    .then(result => {
      logger.serverLog(TAG, `response of sending action ${JSON.stringify(result.body)}`, 'debug')
    })
    .catch(err => {
      return logger.serverLog(TAG,
        `error in sending action ${JSON.stringify(err)}`, 'error')
    })
}

function _sendToClientUsingSocket (body) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'chatbot.test.message',
      payload: {
        chatbot: body
      }
    }
  })
}

function sendFallbackReply (senderId, page, fallbackReply, subscriber) {
  senderAction(senderId, 'typing_on', page.accessToken)
  intervalForEach(fallbackReply, (item) => {
    sendResponse(senderId, item, subscriber, page.accessToken)
    senderAction(senderId, 'typing_off', page.accessToken)
  }, 1500)
}
