const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const chatbotAnalyticsDataLayer = require('./../chatbots/chatbots_analytics.datalayer')
const messageBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const { setSubscriberPayloadInfo } = require('../liveChat/liveChat.logiclayer')
const bigCommerceDataLayer = require('../bigcommerce/bigcommerce.datalayer')
const logicLayer = require('./logiclayer')
const shopifyChatbotLogicLayer = require('../chatbots/commerceChatbot.logiclayer')
const logger = require('../../../components/logger')
const { intervalForEach } = require('./../../../components/utility')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const TAG = 'api/v1/messengerEvents/chatbotAutomation.controller'
const moment = require('moment')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const { callApi } = require('../utility')
const { record } = require('../../global/messageStatistics')
const { sendWebhook } = require('../../global/sendWebhook')
const { pushTalkToAgentAlertInStack } = require('../../global/messageAlerts')
const chatbotTemplates = require('../../../chatbotTemplates')
const { getDialogFlowClient } = require('../../global/dialogflow')
const { pushTalkToAgentAlertInStack } = require('../../global/messageAlerts')

exports.handleChatBotWelcomeMessage = (req, page, subscriber) => {
  record('messengerChatInComing')
  shouldAvoidSendingAutomatedMessage(subscriber, req)
    .then(shouldAvoid => {
      if (!shouldAvoid) {
        chatbotDataLayer.findOneChatBot({ pageId: page._id, published: true })
          .then(async chatbot => {
            try {
              if (chatbot) {
                let unpausePayload = req.postback && req.postback.payload && logicLayer.isJsonString(req.postback.payload) ? JSON.parse(req.postback.payload) : null
                if ((req.postback && req.postback.payload && req.postback.payload === '<GET_STARTED_PAYLOAD>') || unpausePayload.action === 'UNPAUSE_CHATBOT') {
                  let nextMessageBlock = null
                  let currentMessage = null
                  if (chatbot.storeType === 'shopify-nlp') {
                    const response = await chatbotTemplates.handleUserInput(chatbot, {message: {text: 'hi'}}, subscriber, 'messenger')
                    nextMessageBlock = response.chatbotResponse
                    currentMessage = response.automationResponse
                  } else if (chatbot.startingBlockId) {
                    nextMessageBlock = await messageBlockDataLayer.findOneMessageBlock(chatbot.type === 'automated' ? { uniqueId: chatbot.startingBlockId } : { _id: chatbot.startingBlockId })
                    currentMessage = nextMessageBlock
                  }
                  if (nextMessageBlock) {
                    let blockInfo = {
                      chatBotId: chatbot._id,
                      messageBlockId: nextMessageBlock._id,
                      messageBlockTitle: nextMessageBlock.title
                    }
                    senderAction(req.sender.id, 'typing_on', page.accessToken)
                    intervalForEach(nextMessageBlock.payload, (item) => {
                      sendResponse(req.sender.id, item, subscriber, page.accessToken, blockInfo)
                      saveLiveChatMessage(page, subscriber, item)
                      senderAction(req.sender.id, 'typing_off', page.accessToken)
                    }, 1500)
                    if (currentMessage) updateSubscriber({ _id: subscriber._id }, { lastMessageSentByBot: currentMessage }, {})
                    updateBotLifeStatsForBlock(nextMessageBlock, true)
                    updateBotPeriodicStatsForBlock(chatbot, true)
                    updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, nextMessageBlock)
                  }
                  if (req.postback && req.postback.payload) {
                    if (subscriber.hasOwnProperty('isNewSubscriber')) {
                      updateBotLifeStats(chatbot, subscriber.isNewSubscriber)
                      updateBotPeriodicStats(chatbot, subscriber.isNewSubscriber)
                    }
                  }
                } else if (chatbot.fallbackReplyEnabled) {
                  sendFallbackReply(req.sender.id, page, chatbot.fallbackReply, subscriber)
                }
              }
            } catch (err) {
              const message = err || 'error in sending chatbot welcome message'
              return logger.serverLog(message, `${TAG}: exports.handleChatBotWelcomeMessage`, req, {subscriber}, 'error')
            }
          })
          .catch(error => {
            const message = error || 'error in fetching chatbot'
            return logger.serverLog(message, `${TAG}: exports.handleChatBotWelcomeMessage`, req, {subscriber}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'error in checking subsriber last message time from agent'
      return logger.serverLog(message, `${TAG}: exports.handleChatBotWelcomeMessage`, req, {subscriber}, 'error')
    })
}

const updateSubscriber = (query, newPayload, options) => {
  return callApi(`subscribers/update`, 'put', {
    query,
    newPayload,
    options
  }).then((updatedSubscriber) => {
  })
}

exports.handleCommerceChatbot = (event, page, subscriber) => {
  shouldAvoidSendingAutomatedMessage(subscriber, event)
    .then(async (shouldAvoid) => {
      if (!shouldAvoid) {
        try {
          if (event.message && event.message.is_echo) {
            return
          }
          let payload = event.postback && event.postback.payload ? JSON.parse(event.postback.payload) : null
          if (payload && payload.action === 'UNPAUSE_CHATBOT') {
            updateSubscriber({ _id: subscriber._id }, { chatbotPaused: false }, {})
            this.handleChatBotWelcomeMessage(event, page, subscriber)
            return
          }
          let chatbot = await chatbotDataLayer.findOneChatBot({
            pageId: page._id,
            type: 'automated',
            vertical: 'commerce'
          })
          let shouldSend = false
          let isSendingToTester = false
          if (chatbot && chatbot.testSession && !chatbot.published &&
          chatbot.testSession.sessionStartTime) {
            const currentDate = new Date()
            const testSessionTime = new Date(chatbot.testSession.sessionStartTime)
            const diffInMinutes = Math.abs(currentDate - testSessionTime) / 1000 / 60
            if (chatbot.testSession.subscriberId === subscriber.senderId &&
            diffInMinutes <= 60) {
              shouldSend = true
              isSendingToTester = true
            }
          } else if (chatbot && chatbot.published) {
            shouldSend = true
          }
          if (shouldSend) {
            let ecommerceProvider = null
            let nextMessageBlock = null
            let currentMessage = null
            if (chatbot.storeType === 'shopify-nlp') {
              const response = await chatbotTemplates.handleUserInput(chatbot, event, subscriber, 'messenger')
              nextMessageBlock = response.chatbotResponse
              currentMessage = response.automationResponse
            } else if (chatbot.storeType === commerceConstants.shopify) {
              const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
              if (shopifyIntegration) {
                ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                  shopUrl: shopifyIntegration.shopUrl,
                  shopToken: shopifyIntegration.shopToken
                })
              }
            } else if (chatbot.storeType === commerceConstants.bigcommerce) {
              const bigCommerceIntegration = await bigCommerceDataLayer.findOneBigCommerceIntegration({ companyId: chatbot.companyId })
              if (bigCommerceIntegration) {
                ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
                  shopToken: bigCommerceIntegration.shopToken,
                  storeHash: bigCommerceIntegration.payload.context
                })
              }
            } else if (chatbot.storeType === commerceConstants.shops) {
              const user = await getOwner(subscriber.companyId)
              if (user) {
                ecommerceProvider = new EcommerceProvider(commerceConstants.shops, {
                  shopUrl: user.facebookInfo.fbId,
                  shopToken: user.facebookInfo.fbToken
                })
              }
            }
            if (ecommerceProvider) {
              nextMessageBlock = await shopifyChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, subscriber, event)
              currentMessage = nextMessageBlock
            }
            if (nextMessageBlock) {
              if (currentMessage) updateSubscriber({ _id: subscriber._id }, { lastMessageSentByBot: currentMessage }, {})
              senderAction(event.sender.id, 'typing_on', page.accessToken)
              intervalForEach(nextMessageBlock.payload, (item) => {
                sendResponse(event.sender.id, item, subscriber, page.accessToken)
                saveLiveChatMessage(page, subscriber, item)
                senderAction(event.sender.id, 'typing_off', page.accessToken)
              }, 1500)
              if (!isSendingToTester) {
                updateBotLifeStats(chatbot, false)
                updateBotPeriodicStats(chatbot, false)
                updateBotLifeStatsForBlock(nextMessageBlock, true)
                updateBotPeriodicStatsForBlock(chatbot, true)
                updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, nextMessageBlock)
              }
              let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
              let dateNow = moment()
              if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1 && !isSendingToTester) {
                updateBotPeriodicStatsForReturning(chatbot)
              }
              // new subscriber stats logic starts
              let subscriberCreatedAt = moment(subscriber.datetime)
              if (dateNow.diff(subscriberCreatedAt, 'seconds') <= 10 && !isSendingToTester) {
                updateBotLifeStats(chatbot, true)
                updateBotPeriodicStats(chatbot, true)
              }
            }
          }
        } catch (err) {
          const message = err || 'error in fetching commerce chatbot'
          return logger.serverLog(message, `${TAG}: exports.handleCommerceChatbot`, {}, {event, page, subscriber}, 'error')
        }
      } else {
        if (subscriber.chatbotPaused) {
          isTriggerMessage(event, page)
            .then((isTrigger) => {
              if (isTrigger) {
                let allowUserUnPause = shopifyChatbotLogicLayer.allowUserUnpauseChatbot(subscriber)
                updateSubscriber({ _id: subscriber._id }, { lastMessageSentByBot: allowUserUnPause }, {})
                intervalForEach(allowUserUnPause.payload, (item) => {
                  sendResponse(event.sender.id, item, subscriber, page.accessToken)
                  saveLiveChatMessage(page, subscriber, item)
                  senderAction(event.sender.id, 'typing_off', page.accessToken)
                }, 1500)
              }
            })
            .catch(err => {
              const message = err || 'error in finding Trigger'
              return logger.serverLog(message, `${TAG}: exports.handleCommerceChatbot`, {}, {event, page, subscriber}, 'error')
            })
        }
      }
    })
    .catch(error => {
      const message = error || 'error in checking subsriber last message time from agent'
      return logger.serverLog(message, `${TAG}: exports.handleCommerceChatbot`, {}, {event, page, subscriber}, 'error')
    })
}
function getOwner (companyId) {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', { _id: companyId })
      .then(company => {
        callApi('user/query', 'post', {_id: company.ownerId})
          .then(user => {
            resolve(user[0])
          })
          .catch(error => {
            reject(error)
          })
      })
      .catch(error => {
        reject(error)
      })
  })
}
exports.handleTriggerMessage = (req, page, subscriber) => {
  record('messengerChatInComing')
  shouldAvoidSendingAutomatedMessage(subscriber, req)
    .then(shouldAvoid => {
      if (!shouldAvoid) {
        chatbotDataLayer.findOneChatBot({ pageId: page._id, type: 'manual' })
          .then(chatbot => {
            if (chatbot) {
              let shouldSend = false
              let isSendingToTester = false
              if (chatbot.testSession && !chatbot.published &&
              chatbot.testSession.sessionStartTime) {
                const currentDate = new Date()
                const testSessionTime = new Date(chatbot.testSession.sessionStartTime)
                const diffInMinutes = Math.abs(currentDate - testSessionTime) / 1000 / 60
                if (chatbot.testSession.subscriberId === subscriber.senderId &&
                  diffInMinutes <= 60) {
                  shouldSend = true
                  isSendingToTester = true
                }
              } else if (chatbot && chatbot.published) {
                shouldSend = true
              }
              if (shouldSend) {
                let userText = req.message.text.toLowerCase().trim()
                messageBlockDataLayer.findOneMessageBlock({
                  'module.type': 'chatbot',
                  'module.id': chatbot._id,
                  triggers: userText
                })
                  .then(async messageBlock => {
                    try {
                      let blockFound = false
                      if (messageBlock) {
                        blockFound = true
                      } else if (chatbot.dialogFlowAgentId) {
                        const dialogflow = await getDialogFlowClient(chatbot.companyId)
                        const result = await dialogflow.projects.agent.sessions.detectIntent({
                          session: `${chatbot.dialogFlowAgentId}/agent/sessions/${subscriber._id}`,
                          requestBody: {
                            queryInput: {
                              text: {
                                languageCode: 'en',
                                text: userText.length > 256 ? userText.substring(0, 256) : userText
                              }
                            }
                          }
                        })
                        if (
                          result.data && result.data.queryResult &&
                          result.data.queryResult.intentDetectionConfidence >= 0.8 &&
                          result.data.queryResult.intent
                        ) {
                          const intentId = result.data.queryResult.intent.name
                          const block = await messageBlockDataLayer.findOneMessageBlock({dialogFlowIntentId: intentId})
                          if (block) {
                            messageBlock = block
                            blockFound = true
                          }
                        }
                      }
                      if (blockFound) {
                        let blockInfo = {
                          chatBotId: chatbot._id,
                          messageBlockId: messageBlock._id,
                          messageBlockTitle: messageBlock.title
                        }
                        senderAction(req.sender.id, 'typing_on', page.accessToken)
                        intervalForEach(messageBlock.payload, (item) => {
                          sendResponse(req.sender.id, item, subscriber, page.accessToken, blockInfo)
                          saveLiveChatMessage(page, subscriber, item)
                          senderAction(req.sender.id, 'typing_off', page.accessToken)
                        }, 1500)
                        if (!isSendingToTester) {
                          updateBotLifeStats(chatbot, false)
                          updateBotPeriodicStats(chatbot, false)
                          updateBotLifeStatsForBlock(messageBlock, true)
                          updateBotPeriodicStatsForBlock(chatbot, true)
                          updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, messageBlock)
                        }
                        let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
                        let dateNow = moment()
                        if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1 && !isSendingToTester) {
                          updateBotPeriodicStatsForReturning(chatbot)
                        }
                        // new subscriber stats logic starts
                        let subscriberCreatedAt = moment(subscriber.datetime)
                        if (dateNow.diff(subscriberCreatedAt, 'seconds') <= 10 && !isSendingToTester) {
                          updateBotLifeStats(chatbot, true)
                          updateBotPeriodicStats(chatbot, true)
                        }
                        // new subscriber stats logic ends
                      } else if (chatbot.fallbackReplyEnabled) {
                        sendFallbackReply(req.sender.id, page, chatbot.fallbackReply, subscriber)
                      }
                    } catch (err) {
                      const message = err || 'Failed to process text for chatbot reply'
                      logger.serverLog(message, `${TAG}: exports.handleTriggerMessage`, {chatbot}, {req, page, subscriber}, 'error')
                    }
                  })
                  .catch(error => {
                    const message = error || 'error in fetching message block'
                    return logger.serverLog(message, `${TAG}: exports.handleTriggerMessage`, {}, {req, page, subscriber}, 'error')
                  })
              }
            }
          })
          .catch(error => {
            const message = error || 'error in fetching manual chatbot'
            return logger.serverLog(message, `${TAG}: exports.handleTriggerMessage`, {}, {req, page, subscriber}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'error in checking subsriber last message time from agent'
      return logger.serverLog(message, `${TAG}: exports.handleTriggerMessage`, {}, {req, page, subscriber}, 'error')
    })
}

exports.handleChatBotNextMessage = (req, page, subscriber, uniqueId, parentBlockTitle, payloadAction) => {
  record('messengerChatInComing')
  shouldAvoidSendingAutomatedMessage(subscriber, req)
    .then(shouldAvoid => {
      if (!shouldAvoid) {
        chatbotDataLayer.findOneChatBot({ pageId: page._id, type: 'manual' })
          .then(chatbot => {
            if (chatbot) {
              let shouldSend = false
              let isSendingToTester = false
              if (chatbot.testSession && !chatbot.published &&
              chatbot.testSession.sessionStartTime) {
                const currentDate = new Date()
                const testSessionTime = new Date(chatbot.testSession.sessionStartTime)
                const diffInMinutes = Math.abs(currentDate - testSessionTime) / 1000 / 60
                if (chatbot.testSession.subscriberId === subscriber.senderId &&
                diffInMinutes <= 60) {
                  shouldSend = true
                  isSendingToTester = true
                }
              } else if (chatbot.published) {
                shouldSend = true
              }
              if (shouldSend) {
                if (payloadAction === 'talk_to_agent') {
                  handleTalkToAgent(page, subscriber)
                }
                sendWebhook('CHATBOT_OPTION_SELECTED', 'facebook', {
                  psid: subscriber.senderId,
                  pageId: page.pageId,
                  blockTitle: parentBlockTitle,
                  option: req.message ? req.message.text : req.postback.title,
                  chatbotTitle: page.pageName,
                  timestamp: Date.now()
                }, page)
                if (uniqueId) {
                  messageBlockDataLayer.findOneMessageBlock({ uniqueId: uniqueId.toString() })
                    .then(messageBlock => {
                      if (messageBlock) {
                        let blockInfo = {
                          chatBotId: chatbot._id,
                          messageBlockId: messageBlock._id,
                          messageBlockTitle: messageBlock.title
                        }
                        senderAction(req.sender.id, 'typing_on', page.accessToken)
                        intervalForEach(messageBlock.payload, (item) => {
                          sendResponse(req.sender.id, item, subscriber, page.accessToken, blockInfo)
                          saveLiveChatMessage(page, subscriber, item)
                          senderAction(req.sender.id, 'typing_off', page.accessToken)
                        }, 1500)
                        if (!isSendingToTester) {
                          updateBotLifeStatsForBlock(messageBlock, true)
                          updateBotPeriodicStatsForBlock(chatbot, true)
                          updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, messageBlock)
                        }
                        let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
                        let dateNow = moment()
                        if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1 && !isSendingToTester) {
                          updateBotPeriodicStatsForReturning(chatbot)
                        }
                      }
                    })
                    .catch(error => {
                      const message = error || 'error in fetching message block'
                      return logger.serverLog(message, `${TAG}: exports.handleChatBotNextMessage`, {}, {req, page, subscriber, uniqueId, parentBlockTitle}, 'error')
                    })
                }
              }
            }
          })
          .catch(error => {
            const message = error || 'error in fetching chatbot'
            return logger.serverLog(message, `${TAG}: exports.handleChatBotNextMessage`, {}, {req, page, subscriber, uniqueId, parentBlockTitle}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'error in checking subsriber last message time from agent'
      return logger.serverLog(message, `${TAG}: exports.handleChatBotNextMessage`, {}, {req, page, subscriber, uniqueId, parentBlockTitle}, 'error')
    })
}

exports.handleChatBotTestMessage = (req, page, subscriber, type) => {
  record('messengerChatInComing')
  chatbotDataLayer.findOneChatBot({ pageId: page._id, type })
    .then(chatbot => {
      if (chatbot) {
        messageBlockDataLayer.findOneMessageBlock(type === 'automated' ? { uniqueId: chatbot.startingBlockId } : { _id: chatbot.startingBlockId })
          .then(messageBlock => {
            callApi(`companyprofile/query`, 'post', { _id: page.companyId })
              .then(company => {
                if (messageBlock) {
                  _sendToClientUsingSocket(chatbot)
                  senderAction(req.sender.id, 'typing_on', page.accessToken)
                  intervalForEach(messageBlock.payload, (item) => {
                    sendResponse(req.sender.id, item, subscriber, page.accessToken)
                    if (company.saveAutomationMessages) {
                      saveLiveChatMessage(page, subscriber, item)
                    }
                    senderAction(req.sender.id, 'typing_off', page.accessToken)
                  }, 1500)
                }
                saveTesterInfoForLater(page._id, subscriber.id, chatbot)
              })
              .catch(err => {
                const message = err || 'error in fetching company'
                return logger.serverLog(message, `${TAG}: exports.handleChatBotTestMessage`, {}, {req, page, subscriber, type, messageBlock}, 'error')
              })
          })
          .catch(error => {
            const message = error || 'error in fetching message block'
            return logger.serverLog(message, `${TAG}: exports.handleChatBotTestMessage`, {}, {req, page, subscriber, type}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'error in fetching chatbot'
      return logger.serverLog(message, `${TAG}: exports.handleChatBotTestMessage`, {}, {req, page, subscriber, type}, 'error')
    })
}

function sendResponse (recipientId, payload, subscriber, accessToken, blockInfo, metadata) {
  let isCaptureUserPhoneEmail = logicLayer.checkCaptureUserEmailPhone(payload)
  let finalPayload = logicLayer.prepareSendAPIPayload(recipientId, payload, subscriber.firstName, subscriber.lastName, true, metadata)
  record('messengerChatOutGoing')
  facebookApiCaller('v3.2', `me/messages?access_token=${accessToken}`, 'post', finalPayload)
    .then(response => {
      if (isCaptureUserPhoneEmail) {
        setSubscriberPayloadInfo(subscriber, payload, blockInfo)
      }
    })
    .catch(error => {
      const message = error || 'error in sending message'
      return logger.serverLog(message, `${TAG}: exports.sendResponse`, {}, {recipientId, payload, subscriber, accessToken}, 'error')
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
    })
    .catch(err => {
      const message = err || 'error in sending action'
      return logger.serverLog(message, `${TAG}: exports.senderAction`, {}, {recipientId, action, accessToken}, 'error')
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
    saveLiveChatMessage(page, subscriber, item)
    senderAction(senderId, 'typing_off', page.accessToken)
  }, 1500)
}

function updateBotLifeStats (chatbot, isNewSubscriber) {
  if (isNewSubscriber) {
    chatbotDataLayer.genericUpdateChatBot({ _id: chatbot._id }, { $inc: { 'stats.newSubscribers': 1 } })
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotLifeStats`, {}, {chatbot, isNewSubscriber}, 'error')
      })
  } else {
    chatbotDataLayer.genericUpdateChatBot({ _id: chatbot._id }, { $inc: { 'stats.triggerWordsMatched': 1 } })
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotLifeStats`, {}, {chatbot, isNewSubscriber}, 'error')
      })
  }
}

function updateBotPeriodicStats (chatbot, isNewSubscriber) {
  if (isNewSubscriber) {
    chatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
      {
        chatbotId: chatbot._id,
        dateToday: moment(new Date()).format('YYYY-MM-DD'),
        companyId: chatbot.companyId
      },
      { $inc: { 'newSubscribersCount': 1 } },
      { upsert: true }
    )
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot periodic stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotPeriodicStats`, {}, {chatbot, isNewSubscriber}, 'error')
      })
  } else {
    chatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
      {
        chatbotId: chatbot._id,
        dateToday: moment(new Date()).format('YYYY-MM-DD'),
        companyId: chatbot.companyId
      },
      { $inc: { 'triggerWordsMatched': 1 } },
      { upsert: true }
    )
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot periodic stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotPeriodicStats`, {}, {chatbot, isNewSubscriber}, 'error')
      })
  }
}

function updateBotPeriodicStatsForBlock (chatbot, isForSentCount) {
  if (isForSentCount) {
    chatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
      {
        chatbotId: chatbot._id,
        dateToday: moment(new Date()).format('YYYY-MM-DD'),
        companyId: chatbot.companyId
      },
      { $inc: { 'sentCount': 1 } },
      { upsert: true }
    )
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot periodic stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotPeriodicStatsForBlock`, {}, {chatbot, isForSentCount}, 'error')
      })
  } else {
    chatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
      {
        chatbotId: chatbot._id,
        dateToday: moment(new Date()).format('YYYY-MM-DD'),
        companyId: chatbot.companyId
      },
      { $inc: { 'urlBtnClickedCount': 1 } },
      { upsert: true }
    )
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update bot periodic stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotPeriodicStatsForBlock`, {}, {chatbot, isForSentCount}, 'error')
      })
  }
}

function updateBotPeriodicStatsForReturning (chatbot) {
  chatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
    {
      chatbotId: chatbot._id,
      dateToday: moment(new Date()).format('YYYY-MM-DD'),
      companyId: chatbot.companyId
    },
    { $inc: { 'returningSubscribers': 1 } },
    { upsert: true }
  )
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update bot periodic stats'
      return logger.serverLog(message, `${TAG}: exports.updateBotPeriodicStatsForReturning`, {}, {chatbot}, 'error')
    })
}

function updateBotLifeStatsForBlock (messageBlock, isForSentCount) {
  if (isForSentCount) {
    messageBlockDataLayer.genericUpdateMessageBlock({ _id: messageBlock._id }, { $inc: { 'stats.sentCount': 1 } })
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update block bot stats, is sent count true'
        return logger.serverLog(message, `${TAG}: exports.updateBotLifeStatsForBlock`, {}, {messageBlock, isForSentCount}, 'error')
      })
  } else {
    messageBlockDataLayer.genericUpdateMessageBlock({ _id: messageBlock._id }, { $inc: { 'stats.urlBtnClickedCount': 1 } })
      .then(updated => {
      })
      .catch(error => {
        const message = error || 'Failed to update block bot stats'
        return logger.serverLog(message, `${TAG}: exports.updateBotLifeStatsForBlock`, {}, {messageBlock, isForSentCount}, 'error')
      })
  }
}

// function updateBotSubscribersAnalytics (chatbotId, companyId, subscriber, messageBlock) {
//   chatbotAnalyticsDataLayer.findOneForBotSubscribersAnalytics({ messageBlockId: messageBlock._id, 'subscriber.id': subscriber._id })
//     .then(gotBotSubscribersAnalytics => {
//       if (!gotBotSubscribersAnalytics) {
//         chatbotAnalyticsDataLayer.aggregateForBotSubscribersAnalytics({ 'subscriber.id': subscriber._id }, null, null, 10)
//           .then(gotAnalyticsArray => {
//             gotAnalyticsArray = gotAnalyticsArray.map(analyticsItem => {
//               return {
//                 id: analyticsItem.messageBlockId,
//                 title: analyticsItem.messageBlockTitle
//               }
//             })
//             chatbotAnalyticsDataLayer.createForBotSubscribersAnalytics({
//               chatbotId,
//               companyId,
//               subscriber: {
//                 id: subscriber._id,
//                 name: subscriber.firstName + ' ' + subscriber.lastName
//               },
//               messageBlockId: messageBlock.uniqueId,
//               messageBlockTitle: messageBlock.title,
//               blocksPath: [...gotAnalyticsArray, {
//                 id: messageBlock.uniqueId,
//                 title: messageBlock.title
//               }]
//             })
//           })
//       }
//     })
// }

function updateBotSubscribersAnalyticsForSQL (chatbotId, companyId, subscriber, messageBlock) {
  if (subscriber.companyId === '5f3f639e50495a53845512c7') {
    chatbotAnalyticsDataLayer.findForBotSubscribersAnalyticsForSQL({ messageBlockId: messageBlock.uniqueId, subscriberId: subscriber._id })
      .then(gotBotSubscribersAnalytics => {
        if (!gotBotSubscribersAnalytics || gotBotSubscribersAnalytics.length === 0) {
          chatbotAnalyticsDataLayer.findForBotSubscribersAnalyticsForSQL({ subscriberId: subscriber._id })
            .then(gotAnalyticsArray => {
              gotAnalyticsArray = gotAnalyticsArray.map(analyticsItem => {
                return {
                  id: analyticsItem.messageBlockId,
                  title: analyticsItem.messageBlockTitle
                }
              })
              chatbotAnalyticsDataLayer.createForBotSubscribersAnalyticsForSQL({
                chatbotId,
                companyId,
                subscriberId: subscriber._id,
                subscriberName: subscriber.firstName + ' ' + subscriber.lastName,
                messageBlockId: messageBlock.uniqueId,
                messageBlockTitle: messageBlock.title,
                blocksPath: JSON.stringify([...gotAnalyticsArray, {
                  id: messageBlock.uniqueId,
                  title: messageBlock.title
                }])
              })
                .then(result => {
                })
                .catch(err => {
                  const message = err || 'Failed to save the subscriber analytics in sql'
                  return logger.serverLog(message, `${TAG}: exports.updateBotSubscribersAnalyticsForSQL`, {}, {chatbotId, companyId, subscriber, messageBlock}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'Failed to fetch the subscriber analytics in sql'
              return logger.serverLog(message, `${TAG}: exports.updateBotSubscribersAnalyticsForSQL`, {}, {chatbotId, companyId, subscriber, messageBlock}, 'error')
            })
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch the subscriber analytics message block in sql'
        return logger.serverLog(message, `${TAG}: exports.updateBotSubscribersAnalyticsForSQL`, {}, {chatbotId, companyId, subscriber, messageBlock}, 'error')
      })
  }
}

function saveTesterInfoForLater (pageId, subscriberId, chatBot) {
  const query = {
    pageId,
    _id: chatBot._id
  }
  const updated = {
    testSession: {
      subscriberId,
      sessionStartTime: new Date()
    }
  }
  chatbotDataLayer.genericUpdateChatBot(query, updated)
    .then(resp => {})
    .catch(err => {
      const message = err || 'err test Info'
      logger.serverLog(message, `${TAG}: exports.saveTesterInfoForLater`, {}, {pageId, subscriberId, chatBot}, 'error')
    })
}

function shouldAvoidSendingAutomatedMessage (subscriber, event) {
  return new Promise((resolve, reject) => {
    let talkToAgentBlocks = ['ask unpause chatbot', 'talk to agent']
    let payload = event.postback && event.postback.payload && logicLayer.isJsonString(event.postback.payload) ? JSON.parse(event.postback.payload) : null
    let avoidSending = false
    if (!subscriber.chatbotPaused) {
      resolve(avoidSending)
    } else {
      if (subscriber.lastMessageSentByBot && talkToAgentBlocks.includes(subscriber.lastMessageSentByBot.title.toLowerCase())) {
        resolve(avoidSending)
      } else if (payload && payload.action === 'UNPAUSE_CHATBOT') {
        resolve(avoidSending)
      } else {
        callApi(`companyprofile/query`, 'post', { _id: subscriber.companyId })
          .then(company => {
            if (company.automated_options === 'MIX_CHAT' && subscriber.agent_activity_time) {
              const currentDate = new Date()
              const agentTime = new Date(subscriber.agent_activity_time)
              const diffInMinutes = Math.abs(currentDate - agentTime) / 1000 / 60
              if (diffInMinutes < 30) {
                avoidSending = true
              }
            }
            if (!avoidSending) {
              updateSubscriber({ _id: subscriber._id }, {chatbotPaused: false}, {})
              subscriber.chatbotPaused = false
            }
            resolve(avoidSending)
          })
          .catch(err => {
            reject(err)
          })
      }
    }
  })
}

function saveLiveChatMessage (page, subscriber, item) {
  const message = {
    format: 'convos',
    sender_id: page._id,
    recipient_id: subscriber._id,
    sender_fb_id: subscriber.senderId,
    recipient_fb_id: page.pageId,
    subscriber_id: subscriber._id,
    company_id: page.companyId,
    status: 'unseen',
    payload: item
  }
  require('./sessions.controller').saveChatInDb(page, message, subscriber, {message: {is_echo: true}})
}

const isTriggerMessage = (event, page) => {
  return new Promise((resolve, reject) => {
    chatbotDataLayer.findOneChatBot({ pageId: page._id, published: 'true' })
      .then(chatbot => {
        if (chatbot) {
          let userText = event.message && event.message.text ? event.message.text.toLowerCase().trim() : ''
          if (userText !== '') {
            messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
              .then(messageBlock => {
                if (messageBlock && messageBlock.triggers && messageBlock.triggers.includes(userText)) {
                  resolve(true)
                } else {
                  resolve(false)
                }
              })
              .catch(err => {
                const message = err || 'Unable to find messageblock'
                logger.serverLog(message, `${TAG}: exports.isTriggerMessage`, {}, {event, page}, 'error')
                reject(err)
              })
          }
        } else {
          resolve(false)
        }
      })
      .catch(err => {
        const message = err || 'Unable to find Chatbot'
        logger.serverLog(message, `${TAG}: exports.isTriggerMessage`, {}, {event, page}, 'error')
        reject(err)
      })
  })
}

function handleTalkToAgent (page, subscriber) {
  pushTalkToAgentAlertInStack({_id: subscriber.companyId}, subscriber, 'messenger', page.pageName)
  facebookApiCaller('v6.0', `me/messages?access_token=${page.accessToken}`, 'post', {
    messaging_type: 'RESPONSE',
    recipient: JSON.stringify({ id: subscriber.senderId }),
    message: {
      text: 'Our support agents have been notified and someone will get back to you soon.',
      'metadata': 'This is a meta data'
    }
  }).then(result => {
  })
    .catch(err => {
      const message = err || 'error in sending action'
      return logger.serverLog(message, `${TAG}: sendTalkToAgentResponse`, {}, {page, subscriber}, 'error')
    })
}
exports.updateBotPeriodicStatsForBlock = updateBotPeriodicStatsForBlock
exports.updateBotLifeStatsForBlock = updateBotLifeStatsForBlock
exports.sendResponse = sendResponse
exports.isTriggerMessage = isTriggerMessage
