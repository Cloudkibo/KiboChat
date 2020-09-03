const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const { sendNotifications } = require('../../global/sendNotification')
const TAG = '/api/v1/whatsAppEvents/controller.js'
const whatsAppMapper = require('../../../whatsAppMapper/whatsAppMapper')
const sessionLogicLayer = require('../whatsAppSessions/whatsAppSessions.logiclayer')
const whatsAppChatbotDataLayer = require('../whatsAppChatbot/whatsAppChatbot.datalayer')
const whatsAppChatbotLogicLayer = require('../whatsAppChatbot/whatsAppChatbot.logiclayer')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const { ActionTypes } = require('../../../whatsAppMapper/constants')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const whatsAppChatbotAnalyticsDataLayer = require('../whatsAppChatbot/whatsAppChatbot_analytics.datalayer')
const moment = require('moment')
const { pushSessionPendingAlertInStack, pushUnresolveAlertInStack } = require('../../global/messageAlerts')

exports.messageReceived = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
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
                      contact = contact[0]
                      // whatsapp chatbot
                      pushUnresolveAlertInStack(company, contact, 'whatsApp')
                      if (true) {
                        pushSessionPendingAlertInStack(company, contact, 'whatsApp')
                      }
                      if (data.messageData.componentType === 'text') {
                        let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot(company._id)
                        if (chatbot) {
                          const shouldSend = chatbot.published || chatbot.testSubscribers.includes(contact.number)
                          if (shouldSend) {
                            const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
                            if (shopifyIntegration) {
                              const ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                                shopUrl: shopifyIntegration.shopUrl,
                                shopToken: shopifyIntegration.shopToken
                              })
                              let nextMessageBlock = await whatsAppChatbotLogicLayer.getNextMessageBlock(chatbot, ecommerceProvider, contact, data.messageData.text)
                              if (nextMessageBlock) {
                                for (let messagePayload of nextMessageBlock.payload) {
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
                                }
                                updateWhatsAppContact({ _id: contact._id }, { lastMessageSentByBot: nextMessageBlock }, null, {})
                                const triggerWordsMatched = chatbot.triggers.includes(data.messageData.text.toLowerCase()) ? 1 : 0

                                if (isNewContact) {
                                  await whatsAppChatbotDataLayer.updateWhatsAppChatbot(chatbot.companyId, { $inc: { 'stats.triggerWordsMatched': triggerWordsMatched, 'stats.newSubscribers': 1 } })
                                  whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
                                    { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
                                    { $inc: { sentCount: 1, newSubscribersCount: 1, triggerWordsMatched } },
                                    { upsert: true })
                                } else {
                                  whatsAppChatbotDataLayer.updateWhatsAppChatbot(chatbot.companyId, { $inc: { 'stats.triggerWordsMatched': triggerWordsMatched } })
                                  let subscriberLastMessageAt = moment(contact.lastMessagedAt)
                                  let dateNow = moment()
                                  if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1) {
                                    whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
                                      { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
                                      { $inc: { sentCount: 1, returningSubscribers: 1, triggerWordsMatched } },
                                      { upsert: true })
                                  } else {
                                    whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
                                      { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
                                      { $inc: { sentCount: 1, triggerWordsMatched } },
                                      { upsert: true })
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                      if (contact && contact.isSubscribed) {
                        storeChat(number, company.whatsApp.businessNumber, contact, data.messageData)
                      }
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `Failed to fetch contact ${error}`, 'error')
                    })
                })
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to company profile ${JSON.stringify(error)}`, 'error')
              })
          }
        })
        .catch((error) => {
          logger.serverLog(TAG, `Failed to create contact ${JSON.stringify(error)}`, 'error')
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to map whatsapp message received data ${JSON.stringify(req.body)} ${error}`, 'error')
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

function storeChat (from, to, contact, messageData) {
  logicLayer.prepareChat(from, to, contact, messageData).then(chatPayload => {
    callApi(`whatsAppChat`, 'post', chatPayload, 'kibochat')
      .then(message => {
        message.payload.format = 'whatsApp'
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
        _sendMobileNotification(contact, message.payload, contact.companyId)
        let query = { _id: contact._id }
        let updatePayload = { last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now() }
        let incrementPayload = { $inc: { unreadCount: 1, messagesCount: 1 } }
        updateWhatsAppContact(query, updatePayload, incrementPayload, {})
      })
  })
}
function _sendMobileNotification (subscriber, payload, companyId) {
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
          } else {
            if (subscriber.assigned_to.type === 'agent') {
              companyUsers = companyUsers.filter(companyUser => companyUser.userId._id === subscriber.assigned_to.id)
              sendNotifications(title, body, newPayload, companyUsers)
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
                }).catch(error => {
                  logger.serverLog(TAG, `Error while fetching agents ${error}`, 'error')
                })
            }
          }
        }).catch(error => {
          logger.serverLog(TAG, `Error while fetching Last Message ${error}`, 'error')
        })
    }).catch(error => {
      logger.serverLog(TAG, `Error while fetching companyUser ${error}`, 'error')
    })
}

function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
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
            logger.serverLog(TAG, `Failed to fetch whatsAppBroadcastMessages data ${err}`, 'error')
          })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to map whatsapp message status data ${JSON.stringify(req.body)} ${error}`, 'error')
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
      logger.serverLog(`Failed to update message ${err}`, 'error')
    })
}
