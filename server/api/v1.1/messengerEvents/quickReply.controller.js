const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/quickReply.controller'
const { saveLiveChat } = require('./sessions.controller')
const logicLayer = require('./logiclayer')
const { handleCommerceChatbot, handleChatBotNextMessage } = require('./chatbotAutomation.controller')
const { unSetAwaitingUserInfoPayload } = require('./capturePhoneEmail.logiclayer')
const { sendWebhook } = require('../../global/sendWebhook')
const { captureUserEmailAndPhone } = require('./capturePhoneEmail.logiclayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  let messengerPayload = req.body.entry[0].messaging[0]
  console.log(`postback event ${JSON.stringify(messengerPayload)}`)
  console.log(`postback event recipient ${JSON.stringify(messengerPayload.recipient)}`)
  console.log(`postback event sender.id ${JSON.stringify(messengerPayload.sender)}`)
  let pageId = messengerPayload.recipient.id
  let subscriberId = messengerPayload.sender.id
  let subscriber = {}
  let resp = ''
  if (logicLayer.isJsonString(messengerPayload.message.quick_reply.payload)) {
    resp = JSON.parse(messengerPayload.message.quick_reply.payload)
  } else {
    resp = messengerPayload.message.quick_reply.payload
  }

  utility.callApi('pages/query', 'post', { pageId, connected: true })
    .then(page => {
      page = page[0]
      if (page) {
        utility.callApi('subscribers/query', 'post', {senderId: subscriberId, pageId: page._id, isSubscribed: true})
          .then(gotSubscriber => {
            subscriber = gotSubscriber[0]
            if (subscriber) {
              sendWebhook('CHAT_MESSAGE', 'facebook', {
                from: 'subscriber',
                recipientId: page.pageId,
                senderId: subscriber.senderId,
                timestamp: Date.now(),
                message: messengerPayload.message
              }, page)
              if (resp.option === 'captureEmailPhoneSkip' && subscriber.awaitingQuickReplyPayload) {
                if (resp.blockId && resp.messageBlockTitle) {
                  let chatBotInfo = {
                    nextBlockId: resp.blockId,
                    parentBlockTitle: resp.messageBlockTitle
                  }
                  handleChatBotNextMessage(messengerPayload, page, subscriber, chatBotInfo.nextBlockId, chatBotInfo.parentBlockTitle)
                }
              } else if (resp[0] && resp[0].action === '_chatbot') {
                if (logicLayer.isJsonString(messengerPayload.message.quick_reply.payload)) {
                  let quickRepyPayload = JSON.parse(messengerPayload.message.quick_reply.payload)
                  for (let i = 0; i < quickRepyPayload.length; i++) {
                    if (quickRepyPayload[i].action === '_chatbot') {
                      chatbotAutomation.handleChatBotNextMessage(messengerPayload, page, subscriber, quickRepyPayload[i].blockUniqueId, quickRepyPayload[i].parentBlockTitle, quickRepyPayload[i].payloadAction)
                    }
                  }
                }
              } else {
                handleCommerceChatbot(messengerPayload, page, subscriber)
                if (subscriber.awaitingQuickReplyPayload) {
                  captureUserEmailAndPhone(messengerPayload, subscriber, page)
                }
              }
              unSetAwaitingUserInfoPayload(subscriber)
              saveLiveChat(page, subscriber, messengerPayload)
            }
          })
      }
    })
    .catch(error => {
      const message = error || 'error on getting subcribers'
      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {messengerPayload}, 'error')
    })
}
