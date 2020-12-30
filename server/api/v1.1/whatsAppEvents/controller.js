const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const { sendNotifications } = require('../../global/sendNotification')
const TAG = '/api/v1/whatsAppEvents/controller.js'
const whatsAppMapper = require('../../../whatsAppMapper/whatsAppMapper')
const sessionLogicLayer = require('../whatsAppSessions/whatsAppSessions.logiclayer')
const whatsAppChatbotDataLayer = require('../whatsAppChatbot/whatsAppChatbot.datalayer')
const whatsAppChatbotLogicLayer = require('../whatsAppChatbot/whatsAppChatbot.logiclayer')
const { ERROR_INDICATOR } = require('../whatsAppChatbot/constants')
const commerceChatbotLogicLayer = require('../whatsAppChatbot/commerceChatbot.logiclayer')
const airlinesChatbotLogicLayer = require('../whatsAppChatbot/airlinesChatbot.logiclayer')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const bigcommerceDataLayer = require('../bigcommerce/bigcommerce.datalayer')
const { ActionTypes } = require('../../../whatsAppMapper/constants')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const whatsAppChatbotAnalyticsDataLayer = require('../whatsAppChatbot/whatsAppChatbot_analytics.datalayer')
const airlinesConstants = require('./../airlinesProvidersApiLayer/constants')
const AirlinesProvider = require('./../airlinesProvidersApiLayer/AirlineProvidersApiLayer')
const config = require('./../../../config/environment/index')
const moment = require('moment')
const { pushSessionPendingAlertInStack, pushUnresolveAlertInStack } = require('../../global/messageAlerts')
const { record } = require('../../global/messageStatistics')
const chatbotResponder = require('../../../chatbotResponder')
const configureChatbotDatalayer = require('./../configureChatbot/datalayer')
const { intervalForEach } = require('./../../../components/utility')

exports.messageReceived = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  record('whatsappChatInComing')
  whatsAppMapper.handleInboundMessageReceived(req.body.provider, req.body.event)
    .then(data => {
      createContact(data)
        .then((isNewContact) => {
          let number = `+${data.userData.number}`
          if (data.messageData.constructor === Object && Object.keys(data.messageData).length > 0) {
            let query = [
              { $match: { 'whatsApp.accessToken': data.accessToken } }
            ]
            callApi(`companyprofile/aggregate`, 'post', query)
              .then(companies => {
                companies.forEach((company) => {
                  callApi(`whatsAppContacts/query`, 'post', { number: number, companyId: company._id })
                    .then(async (contact) => {
                      try {
                        contact = contact[0]
                        if (contact && contact.isSubscribed) {
                          storeChat(number, company.whatsApp.businessNumber, contact, data.messageData, 'whatsApp')
                        }
                        // whatsapp chatbot
                        pushUnresolveAlertInStack(company, contact, 'whatsApp')
                        if (isNewContact) {
                          _sendEvent(company._id, contact)
                          pushSessionPendingAlertInStack(company, contact, 'whatsApp')
                        }
                        if (company._id === '5a89ecdaf6b0460c552bf7fe') {
                          // NOTE: This if condition is temporary testing code for
                          // adil. We will remove this in future. It will only run for
                          // our own company. Please don't remove this. - Sojharo
                          temporarySuperBotTestHandling(data, contact, company, number, req, isNewContact)
                          return
                        }
                        if (data.messageData.componentType === 'text') {
                          let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: company.whatsApp.activeWhatsappBot })
                          if (chatbot) {
                            const shouldSend = chatbot.published || chatbot.testSubscribers.includes(contact.number)
                            if (shouldSend) {
                              let ecommerceProvider = null
                              let airlinesProvider = null
                              if (chatbot.storeType === commerceConstants.shopify) {
                                const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
                                ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                                  shopUrl: shopifyIntegration.shopUrl,
                                  shopToken: shopifyIntegration.shopToken
                                })
                              } else if (chatbot.storeType === commerceConstants.bigcommerce) {
                                const bigCommerceIntegration = await bigcommerceDataLayer.findOneBigCommerceIntegration({ companyId: chatbot.companyId })
                                ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
                                  shopToken: bigCommerceIntegration.shopToken,
                                  storeHash: bigCommerceIntegration.payload.context
                                })
                              } else if (chatbot.vertical === 'airlines') {
                                airlinesProvider = new AirlinesProvider(airlinesConstants.amadeus, {
                                  clientId: config.amadeus.clientId,
                                  clientSecret: config.amadeus.clientSecret
                                })
                              }
                              let nextMessageBlock = null
                              if (ecommerceProvider) {
                                nextMessageBlock = await commerceChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, contact, data.messageData.text)
                              } else if (airlinesProvider) {
                                nextMessageBlock = await airlinesChatbotLogicLayer.getNextMessageBlock(chatbot, airlinesProvider, contact, data.messageData.text)
                              }
                              if (nextMessageBlock) {
                                for (let i = 0; i < nextMessageBlock.payload.length; i++) {
                                  let chatbotResponse = {
                                    whatsApp: {
                                      accessToken: data.accessToken,
                                      accountSID: data.accountSID,
                                      businessNumber: data.businessNumber
                                    },
                                    recipientNumber: number,
                                    payload: nextMessageBlock.payload[i]
                                  }
                                  record('whatsappChatOutGoing')
                                  whatsAppMapper.whatsAppMapper(req.body.provider, ActionTypes.SEND_CHAT_MESSAGE, chatbotResponse)
                                    .then(sent => {})
                                    .catch(err => {
                                      const message = err || 'Failed to send chat message'
                                      logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {chatbotId: chatbot._id, companyId: chatbot.companyId, chatbotResponse}, 'error')
                                    })
                                  if (company.saveAutomationMessages) {
                                    storeChat(company.whatsApp.businessNumber, number, contact, nextMessageBlock.payload[i], 'convos')
                                  }
                                }
                                updateWhatsAppContact({ _id: contact._id }, { lastMessageSentByBot: nextMessageBlock }, null, {})
                                logicLayer.storeWhatsAppStats(data, chatbot, isNewContact, contact, req)
                              }
                            }
                          }
                        }
                        if (contact && contact.isSubscribed) {
                          if (data.messageData.componentType === 'text') {
                            try {
                              const responseBlock = await chatbotResponder.respondUsingChatbot('whatsApp', req.body.provider, company, data.messageData.text, contact)
                              if (company.saveAutomationMessages && responseBlock) {
                                for (let i = 0; i < responseBlock.payload.length; i++) {
                                  storeChat(company.whatsApp.businessNumber, number, contact, responseBlock.payload[i], 'convos')
                                }
                              }
                            } catch (err) {
                              const message = err || 'Failed to respond using chatbot'
                              logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {}, 'error')
                            }
                          }
                        }
                      } catch (err) {
                        const message = err || 'Failed to respond using chatbot'
                        logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {companyId: company._id}, 'error')
                      }
                    })
                    .catch(error => {
                      const message = error || 'Failed to fetch contact'
                      logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {user: req.user}, 'error')
                    })
                })
              })
              .catch(error => {
                const message = error || 'Failed to company profile'
                logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {}, 'error')
              })
          }
        })
        .catch((error) => {
          const message = error || 'failed to create contact'
          logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {user: req.user}, 'error')
        })
    })
    .catch(error => {
      const message = error || 'Failed to map whatsapp message received data'
      logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {user: req.user}, 'error')
    })
}

function _sendEvent (companyId, contact) {
  require('./../../../config/socketio').sendMessageToClient({
    room_id: companyId,
    body: {
      action: 'Whatsapp_new_subscriber',
      payload: {
        subscriber: contact
      }
    }
  })
}

function createContact (data) {
  let number = `+${data.userData.number}`
  let name = data.userData.name
  let query = [
    { $match: { 'whatsApp.accessToken': data.accessToken } }
  ]
  let isNewContact = false
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/aggregate`, 'post', query, 'accounts')
      .then(companies => {
        if (companies && companies.length > 0) {
          companies.forEach((company, index) => {
            callApi(`whatsAppContacts/query`, 'post', { number: number, companyId: company._id }, 'accounts')
              .then(contact => {
                contact = contact[0]
                if (!contact) {
                  isNewContact = true
                  callApi(`whatsAppContacts`, 'post', {
                    name: name && name !== '' ? name : number,
                    number: number,
                    companyId: company._id
                  }, 'accounts')
                    .then(contact => {
                      if (index === companies.length - 1) {
                        resolve(isNewContact)
                      }
                    })
                    .catch(() => {
                      if (index === companies.length - 1) {
                        resolve(isNewContact)
                      }
                    })
                } else {
                  if (contact.name === contact.number && name && name !== '') {
                    callApi(`whatsAppContacts/update`, 'put', {
                      query: { _id: contact._id },
                      newPayload: { name: name },
                      options: {}
                    }, 'accounts')
                      .then(contact => {
                      })
                  }
                  if (index === companies.length - 1) {
                    resolve(isNewContact)
                  }
                }
              })
              .catch(error => {
                reject(error)
              })
          })
        } else {
          reject(new Error())
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

function storeChat (from, to, contact, messageData, format) {
  logicLayer.prepareChat(from, to, contact, messageData, format).then(chatPayload => {
    callApi(`whatsAppChat`, 'post', chatPayload, 'kibochat')
      .then(message => {
        message.payload.format = format
        require('./../../../config/socketio').sendMessageToClient({
          room_id: contact.companyId,
          body: {
            action: 'new_chat_whatsapp',
            payload: {
              subscriber_id: contact._id,
              chat_id: message._id,
              text: message.payload.text,
              name: contact.name,
              subscriber: contact,
              message: message
            }
          }
        })
        if (format === 'whatsApp') {
          _sendNotification(contact, message.payload, contact.companyId)
          let query = { _id: contact._id }
          let updatePayload = { last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now() }
          let incrementPayload = { $inc: { unreadCount: 1, messagesCount: 1 } }
          updateWhatsAppContact(query, updatePayload, incrementPayload, {})
        }
      })
      .catch(err => {
        const message = err || 'Failed to save WhatsApp chat'
        logger.serverLog(message, `${TAG}: storeChat`, chatPayload, {from, to, contact, messageData, format}, 'error')
      })
  })
    .catch(err => {
      const message = err || 'Failed to prepare chat'
      logger.serverLog(message, `${TAG}: storeChat`, {}, {from, to, contact, messageData, format}, 'error')
    })
}

function saveNotifications (contact, companyUsers) {
  companyUsers.forEach((companyUser, index) => {
    let notificationsData = {
      message: `${contact.name} sent a message to your WhatsApp`,
      category: { type: 'new_message', id: contact._id },
      agentId: companyUser.userId._id,
      companyId: companyUser.companyId,
      platform: 'whatsApp'
    }
    callApi(`notifications`, 'post', notificationsData, 'kibochat')
      .then(savedNotification => {
        require('./../../../config/socketio').sendMessageToClient({
          room_id: companyUser.companyId,
          body: {
            action: 'new_notification',
            payload: notificationsData
          }
        })
      })
      .catch(error => {
        const message = error || 'Failed to save notification'
        logger.serverLog(message, `${TAG}: exports.saveNotifications`, {}, { contact, companyUsers }, 'error')
      })
  })
}

function _sendNotification (subscriber, payload, companyId) {
  let title = subscriber.name
  let body = payload.text
  let newPayload = {
    action: 'chat_whatsapp',
    subscriber: subscriber
  }
  callApi(`companyUser/queryAll`, 'post', { companyId: companyId }, 'accounts')
    .then(companyUsers => {
      let lastMessageData = sessionLogicLayer.getQueryData('', 'aggregate', { companyId: companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
      callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
        .then(gotLastMessage => {
          subscriber.lastPayload = gotLastMessage[0].payload
          subscriber.lastRepliedBy = gotLastMessage[0].replied_by
          subscriber.lastDateTime = gotLastMessage[0].datetime
          if (!subscriber.is_assigned) {
            sendNotifications(title, body, newPayload, companyUsers)
            saveNotifications(subscriber, companyUsers)
          } else {
            if (subscriber.assigned_to.type === 'agent') {
              companyUsers = companyUsers.filter(companyUser => companyUser.userId._id === subscriber.assigned_to.id)
              sendNotifications(title, body, newPayload, companyUsers)
              saveNotifications(subscriber, companyUsers)
            } else {
              callApi(`teams/agents/query`, 'post', { teamId: subscriber.assigned_to.id }, 'accounts')
                .then(teamagents => {
                  teamagents = teamagents.map(teamagent => teamagent.agentId._id)
                  companyUsers = companyUsers.filter(companyUser => {
                    if (teamagents.includes(companyUser.userId._id)) {
                      return companyUser
                    }
                  })
                  sendNotifications(title, body, newPayload, companyUsers)
                  saveNotifications(subscriber, companyUsers)
                }).catch(error => {
                  const message = error || 'Error while fetching agents'
                  logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { subscriber, payload, companyId }, 'error')
                })
            }
          }
        }).catch(error => {
          const message = error || 'Error while fetching Last Message'
          logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { subscriber, payload, companyId }, 'error')
        })
    }).catch(error => {
      const message = error || 'Error while fetching companyUser'
      logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { subscriber, payload, companyId }, 'error')
    })
}

function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { query, bodyForUpdate, bodyForIncrement, options }, 'error')
    })
}

exports.messageStatus = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  whatsAppMapper.handleInboundMessageStatus(req.body.provider, req.body.event)
    .then(data => {
      if (data.status === 'delivered' || data.status === 'seen') {
        let query = {
          purpose: 'findOne',
          match: { messageId: data.messageId }
        }
        callApi(`whatsAppChat/query`, 'post', query, 'kibochat')
          .then(message => {
            if (message) {
              updateChat(message, data)
            }
          })
          .catch((err) => {
            const message = err || 'Failed to fetch whatsAppBroadcastMessages data'
            logger.serverLog(message, `${TAG}: exports.messageStatus`, req.body, {user: req.user}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'Failed to map whatsapp message status data'
      logger.serverLog(message, `${TAG}: exports.messageStatus`, req.body, {user: req.user}, 'error')
    })
}

function updateChat (message, body) {
  let dateTime = Date.now()
  let matchQuery = {
    $or: [
      { _id: message._id },
      { _id: { $lt: message._id } }
    ],
    format: 'convos',
    contactId: message.contactId
  }
  if (body.status === 'delivered') {
    matchQuery.$or = [
      { delivered: false },
      { delivered: { $exists: false } }
    ]
  } else {
    matchQuery.$or = [
      { seen: false },
      { seen: { $exists: false } }
    ]
  }
  let updated = body.status === 'delivered'
    ? { delivered: true, deliveryDateTime: dateTime }
    : { seen: true, seenDateTime: dateTime }
  let dataToSend = {
    action: body.status === 'delivered' ? 'message_delivered_whatsApp' : 'message_seen_whatsApp',
    payload: {
      message: message
    }
  }
  if (body.status === 'delivered') {
    dataToSend.payload.message.delivered = true
    dataToSend.payload.message.deliveredDateTime = dateTime
    dataToSend.payload.message.action = 'message_delivered_whatsApp'
  } else {
    dataToSend.payload.message.seen = true
    dataToSend.payload.message.seenDateTime = dateTime
    dataToSend.payload.message.action = 'message_seen_whatsApp'
  }
  updateChatInDB(matchQuery, updated, dataToSend)
}

function updateChatInDB (match, updated, dataToSend) {
  let updateData = {
    purpose: 'updateAll',
    match: match,
    updated: updated
  }
  callApi(`whatsAppChat`, 'put', updateData, 'kibochat')
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: dataToSend.payload.message.companyId,
        body: dataToSend
      })
    })
    .catch((err) => {
      const message = err || 'Failed to update message'
      logger.serverLog(message, `${TAG}: exports.updateChatInDB`, {}, { match, updated, dataToSend }, 'error')
    })
}

// NOTE: This is just a temporary function to give capability of super chatbot
// to adil which will activate selected chatbots for demo purposes.
// This will only be called if chatbot is on our own company.
// This code will be removed in future there it may contain some repetitive code from
// above - Sojharo
async function temporarySuperBotTestHandling (data, contact, company, number, req, isNewContact) {
  if (
    (data.messageData.text.toLowerCase() === 'select') ||
    (!contact.activeChatbotId &&
    !(contact.lastMessageSentByBot &&
      contact.lastMessageSentByBot.module.id === 'sojharo-s-chatbot-custom-id'))) {
    try {
      const allChatbots = await getAllChatbots(company)

      let nextMessageBlock = whatsAppChatbotLogicLayer.getChatbotsListMessageBlock(allChatbots)
      if (nextMessageBlock) {
        sendWhatsAppMessage(nextMessageBlock, data, number, req)
        const updateWhatsAppContactData = {
          lastMessageSentByBot: nextMessageBlock
        }
        if (contact.commerceCustomer) {
          updateWhatsAppContactData.commerceCustomer = null
        }
        if (contact.shoppingCart) {
          updateWhatsAppContactData.shoppingCart = []
        }
        updateWhatsAppContact({ _id: contact._id }, updateWhatsAppContactData, null, {})
        if (company.saveAutomationMessages) {
          for (let i = 0; i < nextMessageBlock.payload.length; i++) {
            storeChat(company.whatsApp.businessNumber, number, contact, nextMessageBlock.payload[i], 'convos')
          }
        }
      }
    } catch (err) {
      const message = err || 'Error in async await calls above'
      logger.serverLog(message, `${TAG}: exports.temporarySuperBotTestHandling`, req.body, {data, contact, company, number, req, isNewContact}, 'error')
    }
  } else if (contact.lastMessageSentByBot && contact.lastMessageSentByBot.module.id === 'sojharo-s-chatbot-custom-id') {
    const menuInput = parseInt(data.messageData.text)
    const lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]

    if (!isNaN(menuInput)) {
      const selectedBot = lastMessageSentByBot.menu[menuInput]
      if (selectedBot) {
        contact.activeChatbotId = selectedBot.botId
        let nextMessageBlock = await chatbotResponder.respondUsingChatbot('whatsApp', req.body.provider, company, 'hi', contact, true)
        if (!nextMessageBlock) {
          let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: selectedBot.botId })
          let ecommerceProvider = null
          let airlinesProvider = null
          if (chatbot.vertical === 'commerce') {
            if (chatbot.storeType === commerceConstants.shopify) {
              const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
              ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                shopUrl: shopifyIntegration.shopUrl,
                shopToken: shopifyIntegration.shopToken
              })
            } else if (chatbot.storeType === commerceConstants.bigcommerce) {
              const bigCommerceIntegration = await bigcommerceDataLayer.findOneBigCommerceIntegration({ companyId: chatbot.companyId })
              ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
                shopToken: bigCommerceIntegration.shopToken,
                storeHash: bigCommerceIntegration.payload.context
              })
            }
          } else if (chatbot.vertical === 'airlines') {
            airlinesProvider = new AirlinesProvider(airlinesConstants.amadeus, {
              clientId: config.amadeus.clientId,
              clientSecret: config.amadeus.clientSecret
            })
          }
          if (ecommerceProvider) {
            nextMessageBlock = await commerceChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, contact, 'hi')
          } else if (airlinesProvider) {
            nextMessageBlock = await airlinesChatbotLogicLayer.getNextMessageBlock(chatbot, airlinesProvider, contact, 'hi')
          }
          if (nextMessageBlock) {
            sendWhatsAppMessage(nextMessageBlock, data, number, req)
          }
        }
        if (nextMessageBlock) {
          updateWhatsAppContact({ _id: contact._id },
            { lastMessageSentByBot: nextMessageBlock,
              activeChatbotId: selectedBot.botId,
              activeChatbotBuilt: selectedBot.built
            }, null, {})
        }
      } else {
        sendInvalidSelectChatbotsResponse(data, contact, company, number, req)
      }
    } else {
      sendInvalidSelectChatbotsResponse(data, contact, company, number, req)
    }
  } else {
    temporarySuperBotResponseHandling(data, contact, company, number, req, isNewContact)
  }
}

async function sendInvalidSelectChatbotsResponse (data, contact, company, number, req) {
  const allChatbots = await getAllChatbots(company)

  let nextMessageBlock = whatsAppChatbotLogicLayer.getChatbotsListMessageBlock(allChatbots)

  if (nextMessageBlock && allChatbots.length > 0) {
    nextMessageBlock.payload[0].text = `Please enter a number between 0 and ${allChatbots.length - 1}\n\n${nextMessageBlock.payload[0].text}`
    sendWhatsAppMessage(nextMessageBlock, data, number, req)
    updateWhatsAppContact({ _id: contact._id }, { lastMessageSentByBot: nextMessageBlock }, null, {})
    if (company.saveAutomationMessages) {
      for (let i = 0; i < nextMessageBlock.payload.length; i++) {
        storeChat(company.whatsApp.businessNumber, number, contact, nextMessageBlock.payload[i], 'convos')
      }
    }
  }
}

async function getAllChatbots (company) {
  let chatbots = await whatsAppChatbotDataLayer.fetchAllWhatsAppChatbots({ companyId: company._id, published: true })
  chatbots = chatbots.map(chatbot => {
    let title = ''
    if (chatbot.vertical === 'airlines') {
      title = 'airlines'
    } else if (chatbot.vertical === 'commerce') {
      title = chatbot.storeType
    }
    return {botId: chatbot._id, title, built: 'automated', ...chatbot}
  })

  let sqlChatbots = await configureChatbotDatalayer.fetchChatbotRecords({platform: 'whatsApp', companyId: company._id, published: true})
  sqlChatbots = sqlChatbots.map(chatbot => {
    return {botId: chatbot.chatbotId, built: 'custom', ...chatbot}
  })

  const allChatbots = [...sqlChatbots, ...chatbots]
  return allChatbots
}

// NOTE: This is just a temporary function to give capability of super chatbot
// to adil which will activate selected chatbots for demo purposes.
// This will only be called if chatbot is on our own company.
// This code will be removed in future there it may contain some repetitive code from
// above - Sojharo
async function temporarySuperBotResponseHandling (data, contact, company, number, req, isNewContact) {
  try {
    if (data.messageData.componentType === 'text' && contact.activeChatbotBuilt === 'automated') {
      let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: contact.activeChatbotId })
      if (chatbot) {
        const shouldSend = chatbot.published || chatbot.testSubscribers.includes(contact.number)
        if (shouldSend) {
          let ecommerceProvider = null
          let airlinesProvider = null
          if (chatbot.vertical === 'commerce') {
            if (chatbot.storeType === commerceConstants.shopify) {
              const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
              ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                shopUrl: shopifyIntegration.shopUrl,
                shopToken: shopifyIntegration.shopToken
              })
            } else if (chatbot.storeType === commerceConstants.bigcommerce) {
              const bigCommerceIntegration = await bigcommerceDataLayer.findOneBigCommerceIntegration({ companyId: chatbot.companyId })
              ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
                shopToken: bigCommerceIntegration.shopToken,
                storeHash: bigCommerceIntegration.payload.context
              })
            }
          } else if (chatbot.vertical === 'airlines') {
            airlinesProvider = new AirlinesProvider(airlinesConstants.amadeus, {
              clientId: config.amadeus.clientId,
              clientSecret: config.amadeus.clientSecret
            })
          }
          let nextMessageBlock = null
          if (ecommerceProvider) {
            nextMessageBlock = await commerceChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, contact, data.messageData.text)
          } else if (airlinesProvider) {
            nextMessageBlock = await airlinesChatbotLogicLayer.getNextMessageBlock(chatbot, airlinesProvider, contact, data.messageData.text)
          }
          if (nextMessageBlock) {
            if (nextMessageBlock.payload[0].text && nextMessageBlock.payload[0].text.includes(ERROR_INDICATOR) && moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15) {
              const allChatbots = await getAllChatbots(company)
              nextMessageBlock = whatsAppChatbotLogicLayer.getChatbotsListMessageBlock(allChatbots)
              if (nextMessageBlock) {
                sendWhatsAppMessage(nextMessageBlock, data, number, req)
                const updateWhatsAppContactData = {
                  lastMessageSentByBot: nextMessageBlock
                }
                if (contact.commerceCustomer) {
                  updateWhatsAppContactData.commerceCustomer = null
                }
                if (contact.shoppingCart) {
                  updateWhatsAppContactData.shoppingCart = []
                }
                updateWhatsAppContact({ _id: contact._id }, updateWhatsAppContactData, null, {})
                if (company.saveAutomationMessages) {
                  for (let i = 0; i < nextMessageBlock.payload.length; i++) {
                    storeChat(company.whatsApp.businessNumber, number, contact, nextMessageBlock.payload[i], 'convos')
                  }
                }
                return
              }
            }
            sendWhatsAppMessage(nextMessageBlock, data, number, req)
            if (company.saveAutomationMessages) {
              for (let i = 0; i < nextMessageBlock.payload.length; i++) {
                storeChat(company.whatsApp.businessNumber, number, contact, nextMessageBlock.payload[i], 'convos')
              }
            }
            updateWhatsAppContact({ _id: contact._id }, { lastMessageSentByBot: nextMessageBlock }, null, {})
            logicLayer.storeWhatsAppStats(data, chatbot, isNewContact, contact, req)
          }
        }
      }
    }
  } catch (err) {
    const message = err || 'Error in async await calls above'
    logger.serverLog(message, `${TAG}: exports.temporarySuperBotResponseHandling`, req.body, {data, contact, company, number, isNewContact}, 'error')
  }
  if (contact && contact.isSubscribed) {
    if (data.messageData.componentType === 'text') {
      try {
        const responseBlock = await chatbotResponder.respondUsingChatbot('whatsApp', req.body.provider, company, data.messageData.text, contact, true)
        if (company.saveAutomationMessages && responseBlock) {
          for (let i = 0; i < responseBlock.payload.length; i++) {
            storeChat(company.whatsApp.businessNumber, number, contact, responseBlock.payload[i], 'convos')
          }
        }
      } catch (err) {
        const message = err || 'Failed to respond using chatbot'
        logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {}, 'error')
      }
    }
  }
}

function sendWhatsAppMessage (nextMessageBlock, data, number, req) {
  intervalForEach(nextMessageBlock.payload, (messagePayload) => {
    let chatbotResponse = {
      whatsApp: {
        accessToken: data.accessToken,
        accountSID: data.accountSID,
        businessNumber: data.businessNumber
      },
      recipientNumber: number,
      payload: messagePayload
    }

    whatsAppMapper.whatsAppMapper(req.body.provider, ActionTypes.SEND_CHAT_MESSAGE, chatbotResponse)
      .then(sent => {})
      .catch(err => {
        const message = err || 'Failed to send chat message'
        logger.serverLog(message, `${TAG}: exports.sendWhatsAppMessage`, req.body, {chatbotResponse}, 'error')
      })
  }, 1500)
}
