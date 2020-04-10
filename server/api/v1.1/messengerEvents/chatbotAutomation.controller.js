const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const messageBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const { intervalForEach } = require('./../../../components/utility')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const TAG = 'api/v1/messengerEvents/chatbotAutomation.controller'

exports.handleChatBotAutomationEvents = (req, page, subscriber) => {
  chatbotDataLayer.findOneChatBot({pageId: page._id})
    .then(chatbot => {
      if (chatbot) {
        chatbot.triggers = chatbot.triggers.map(item => item.toLowerCase())
        if ((req.message && chatbot.triggers.indexOf(req.message.text.toLowerCase()) > -1) || 
        (req.postback && req.postback.payload)) {
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
        }
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
      logger.serverLog(TAG, `response of sending block ${JSON.stringify(response.body)}`, 'debug')
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
