const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/quickReply.controller'
const { saveLiveChat } = require('./sessions.controller')
const logicLayer = require('./logiclayer')
const { handleCommerceChatbot } = require('./chatbotAutomation.controller')
const { sendWebhook } = require('../../global/sendWebhook')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messengerPayload = req.body.entry[0].messaging[0]
  let pageId = messengerPayload.recipient.id
  let subscriberId = messengerPayload.sender.id
  let subscriber = {}
  utility.callApi('pages/query', 'post', { pageId, connected: true })
    .then(page => {
      page = page[0]
      if (page) {
        utility.callApi('subscribers/query', 'post', { senderId: subscriberId, pageId: page._id })
          .then(gotSubscriber => {
            subscriber = gotSubscriber[0]
            sendWebhook('CHAT_MESSAGE', 'facebook', {
              from: 'subscriber',
              recipientId: page.pageId,
              senderId: subscriber.senderId,
              timestamp: Date.now(),
              message: messengerPayload.message
            }, page)
            handleCommerceChatbot(messengerPayload, page, subscriber)
            if (logicLayer.isJsonString(messengerPayload.message.quick_reply.payload)) {
              let quickRepyPayload = JSON.parse(messengerPayload.message.quick_reply.payload)
              for (let i = 0; i < quickRepyPayload.length; i++) {
                if (quickRepyPayload[i].action === '_chatbot') {
                  chatbotAutomation.handleChatBotNextMessage(messengerPayload, page, subscriber, quickRepyPayload[i].blockUniqueId, quickRepyPayload[i].parentBlockTitle)
                }
              }
            }
            saveLiveChat(page, subscriber, messengerPayload)
          })
      }
    })
    .catch(error => {
      const message = error || 'error on getting subcribers'
      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {messengerPayload}, 'error')
    })
}
