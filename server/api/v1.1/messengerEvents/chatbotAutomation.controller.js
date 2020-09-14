const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const chatbotAnalyticsDataLayer = require('./../chatbots/chatbots_analytics.datalayer')
const messageBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const logicLayer = require('./logiclayer')
const shopifyChatbotLogicLayer = require('../chatbots/shopifyChatbot.logiclayer')
const logger = require('../../../components/logger')
const { intervalForEach } = require('./../../../components/utility')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const TAG = 'api/v1/messengerEvents/chatbotAutomation.controller'
const moment = require('moment')
const { record } = require('../../global/messageStatistics')

const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const { callApi } = require('../utility')

exports.handleChatBotWelcomeMessage = (req, page, subscriber) => {
  chatbotDataLayer.findOneChatBot({ pageId: page._id, published: true })
    .then(chatbot => {
      if (chatbot) {
        if (req.postback && req.postback.payload && req.postback.payload === '<GET_STARTED_PAYLOAD>') {
          if (chatbot.startingBlockId) {
            messageBlockDataLayer.findOneMessageBlock({ _id: chatbot.startingBlockId })
              .then(messageBlock => {
                if (messageBlock) {
                  senderAction(req.sender.id, 'typing_on', page.accessToken)
                  intervalForEach(messageBlock.payload, (item) => {
                    sendResponse(req.sender.id, item, subscriber, page.accessToken)
                    senderAction(req.sender.id, 'typing_off', page.accessToken)
                  }, 1500)
                  updateBotLifeStatsForBlock(messageBlock, true)
                  updateBotPeriodicStatsForBlock(chatbot, true)
                  updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, messageBlock)
                }
              })
              .catch(error => {
                logger.serverLog(TAG,
                  `error in fetching message block ${JSON.stringify(error)}`,
                  'error')
                logger.serverLog(TAG,
                  `error in fetching message block ${error}`,
                  'error')
              })
            if (req.postback && req.postback.payload) {
              if (subscriber.hasOwnProperty('isNewSubscriber')) {
                updateBotLifeStats(chatbot, subscriber.isNewSubscriber)
                updateBotPeriodicStats(chatbot, subscriber.isNewSubscriber)
              }
            }
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

const updateSubscriber = (query, newPayload, options) => {
  return callApi(`subscribers/update`, 'put', {
    query,
    newPayload,
    options: {}
  })
}

exports.handleShopifyChatbot = async (event, page, subscriber) => {
  try {
    logger.serverLog(TAG, `shopify chatbot page ${JSON.stringify(page)}`, 'info')
    logger.serverLog(TAG, `searching for shopify chatbot ${JSON.stringify({
      pageId: page._id,
      published: true,
      type: 'automated',
      vertical: 'commerce'
    })}`, 'info')
    let chatbot = await chatbotDataLayer.findOneChatBot({
      pageId: page._id,
      published: true,
      type: 'automated',
      vertical: 'commerce'
    })
    logger.serverLog(TAG, `shopify chatbot found ${JSON.stringify(chatbot)}`, 'info')
    if (chatbot) {
      const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
      logger.serverLog(TAG, `shopify integration ${JSON.stringify(shopifyIntegration)}`, 'info')
      if (shopifyIntegration) {
        const ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        logger.serverLog(TAG, `handleShopifyChatbot event ${JSON.stringify(event)}`, 'info')
        let nextMessageBlock = await shopifyChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, subscriber, event.message)
        updateSubscriber({ _id: subscriber._id }, { lastMessageSentByBot: nextMessageBlock }, null, {})
        logger.serverLog(TAG, `shopify chatbot next message block ${JSON.stringify(nextMessageBlock)}`, 'info')
        if (nextMessageBlock) {
          senderAction(event.sender.id, 'typing_on', page.accessToken)
          intervalForEach(nextMessageBlock.payload, (item) => {
            sendResponse(event.sender.id, item, subscriber, page.accessToken)
            senderAction(event.sender.id, 'typing_off', page.accessToken)
          }, 1500)
          updateBotLifeStats(chatbot, false)
          updateBotPeriodicStats(chatbot, false)
          updateBotLifeStatsForBlock(nextMessageBlock, true)
          updateBotPeriodicStatsForBlock(chatbot, true)
          updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, nextMessageBlock)
          let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
          let dateNow = moment()
          if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1) {
            updateBotPeriodicStatsForReturning(chatbot)
          }
          // new subscriber stats logic starts
          let subscriberCreatedAt = moment(subscriber.datetime)
          if (dateNow.diff(subscriberCreatedAt, 'seconds') <= 10) {
            updateBotLifeStats(chatbot, true)
            updateBotPeriodicStats(chatbot, true)
          }
        }
      }
    }
  } catch (err) {
    logger.serverLog(TAG,
      `error in fetching shopify chatbot ${err}`, 'error')
  }
}

exports.handleTriggerMessage = (req, page, subscriber) => {
  record('messengerChatInComing')
  chatbotDataLayer.findOneChatBot({ pageId: page._id, published: true, type: 'manual' })
    .then(chatbot => {
      logger.serverLog(TAG, `manual chatbot found ${JSON.stringify(chatbot)}`, 'info')
      if (chatbot) {
        let userText = req.message.text.toLowerCase().trim()
        messageBlockDataLayer.findOneMessageBlock({
          'module.type': 'chatbot',
          'module.id': chatbot._id,
          triggers: userText
        })
          .then(messageBlock => {
            logger.serverLog(TAG, `manual chatbot message block ${JSON.stringify(shopifyChatbotLogicLayer.getMessageBlocks)}`, 'info')
            if (messageBlock) {
              senderAction(req.sender.id, 'typing_on', page.accessToken)
              intervalForEach(messageBlock.payload, (item) => {
                sendResponse(req.sender.id, item, subscriber, page.accessToken)
                senderAction(req.sender.id, 'typing_off', page.accessToken)
              }, 1500)
              updateBotLifeStats(chatbot, false)
              updateBotPeriodicStats(chatbot, false)
              updateBotLifeStatsForBlock(messageBlock, true)
              updateBotPeriodicStatsForBlock(chatbot, true)
              updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, messageBlock)
              let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
              let dateNow = moment()
              if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1) {
                updateBotPeriodicStatsForReturning(chatbot)
              }
              // new subscriber stats logic starts
              let subscriberCreatedAt = moment(subscriber.datetime)
              if (dateNow.diff(subscriberCreatedAt, 'seconds') <= 10) {
                updateBotLifeStats(chatbot, true)
                updateBotPeriodicStats(chatbot, true)
              }
              // new subscriber stats logic ends
            } else if (chatbot.fallbackReplyEnabled) {
              sendFallbackReply(req.sender.id, page, chatbot.fallbackReply, subscriber)
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
        `error in fetching manual chatbot ${error}`, 'error')
    })
}

exports.handleChatBotNextMessage = (req, page, subscriber, uniqueId) => {
  record('messengerChatInComing')
  chatbotDataLayer.findOneChatBot({ pageId: page._id, published: true })
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
              updateBotLifeStatsForBlock(messageBlock, true)
              updateBotPeriodicStatsForBlock(chatbot, true)
              updateBotSubscribersAnalyticsForSQL(chatbot._id, chatbot.companyId, subscriber, messageBlock)
              let subscriberLastMessageAt = moment(subscriber.lastMessagedAt)
              let dateNow = moment()
              if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1) {
                updateBotPeriodicStatsForReturning(chatbot)
              }
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
  record('messengerChatInComing')
  chatbotDataLayer.findOneChatBot({ pageId: page._id })
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
  record('messengerChatOutGoing')
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

function updateBotLifeStats (chatbot, isNewSubscriber) {
  if (isNewSubscriber) {
    chatbotDataLayer.genericUpdateChatBot({ _id: chatbot._id }, { $inc: { 'stats.newSubscribers': 1 } })
      .then(updated => {
        logger.serverLog(TAG, `bot stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot stats ${JSON.stringify(error)}`, 'error')
      })
  } else {
    chatbotDataLayer.genericUpdateChatBot({ _id: chatbot._id }, { $inc: { 'stats.triggerWordsMatched': 1 } })
      .then(updated => {
        logger.serverLog(TAG, `bot stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot stats ${JSON.stringify(error)}`, 'error')
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
        logger.serverLog(TAG, `bot periodic stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot periodic stats ${JSON.stringify(error)}`, 'error')
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
        logger.serverLog(TAG, `bot periodic stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot periodic stats ${JSON.stringify(error)}`, 'error')
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
        logger.serverLog(TAG, `bot periodic stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot periodic stats ${JSON.stringify(error)}`, 'error')
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
        logger.serverLog(TAG, `bot periodic stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update bot periodic stats ${JSON.stringify(error)}`, 'error')
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
      logger.serverLog(TAG, `bot periodic stats updated successfully`, 'debug')
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update bot periodic stats ${JSON.stringify(error)}`, 'error')
    })
}

function updateBotLifeStatsForBlock (messageBlock, isForSentCount) {
  if (isForSentCount) {
    messageBlockDataLayer.genericUpdateMessageBlock({ _id: messageBlock._id }, { $inc: { 'stats.sentCount': 1 } })
      .then(updated => {
        logger.serverLog(TAG, `bot block stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update block bot stats ${JSON.stringify(error)}`, 'error')
      })
  } else {
    messageBlockDataLayer.genericUpdateMessageBlock({ _id: messageBlock._id }, { $inc: { 'stats.urlBtnClickedCount': 1 } })
      .then(updated => {
        logger.serverLog(TAG, `bot block stats updated successfully`, 'debug')
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to update block bot stats ${JSON.stringify(error)}`, 'error')
      })
  }
}

function updateBotSubscribersAnalytics (chatbotId, companyId, subscriber, messageBlock) {
  chatbotAnalyticsDataLayer.findOneForBotSubscribersAnalytics({ messageBlockId: messageBlock._id, 'subscriber.id': subscriber._id })
    .then(gotBotSubscribersAnalytics => {
      if (!gotBotSubscribersAnalytics) {
        chatbotAnalyticsDataLayer.aggregateForBotSubscribersAnalytics({ 'subscriber.id': subscriber._id }, null, null, 10)
          .then(gotAnalyticsArray => {
            gotAnalyticsArray = gotAnalyticsArray.map(analyticsItem => {
              return {
                id: analyticsItem.messageBlockId,
                title: analyticsItem.messageBlockTitle
              }
            })
            chatbotAnalyticsDataLayer.createForBotSubscribersAnalytics({
              chatbotId,
              companyId,
              subscriber: {
                id: subscriber._id,
                name: subscriber.firstName + ' ' + subscriber.lastName
              },
              messageBlockId: messageBlock.uniqueId,
              messageBlockTitle: messageBlock.title,
              blocksPath: [...gotAnalyticsArray, {
                id: messageBlock.uniqueId,
                title: messageBlock.title
              }]
            })
          })
      }
    })
}

function updateBotSubscribersAnalyticsForSQL (chatbotId, companyId, subscriber, messageBlock) {
  chatbotAnalyticsDataLayer.findForBotSubscribersAnalyticsForSQL({ messageBlockId: messageBlock._id, subscriberId: subscriber._id })
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
                logger.serverLog(TAG, 'Saved the subscriber analytics', 'debug')
                logger.serverLog(TAG, `${JSON.stringify(result)}`, 'debug')
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to save the subscriber analytics in sql ${JSON.stringify(err)}`, 'error')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch the subscriber analytics in sql ${JSON.stringify(err)}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch the subscriber analytics message block in sql ${JSON.stringify(err)}`, 'error')
    })
}

exports.updateBotPeriodicStatsForBlock = updateBotPeriodicStatsForBlock
exports.updateBotLifeStatsForBlock = updateBotLifeStatsForBlock
