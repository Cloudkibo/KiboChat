const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppEvents/controller.js'
const whatsAppMapper = require('../../../whatsAppMapper/whatsAppMapper')
const whatsAppChatbotDataLayer = require('../../v1.1/whatsAppChatbot/whatsAppChatbot.datalayer')
const messageBlockDataLayer = require('../../v1.1/messageBlock/messageBlock.datalayer')
const { ActionTypes } = require('../../../whatsAppMapper/constants')

exports.messageReceived = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  whatsAppMapper.handleInboundMessageReceived(req.body.provider, req.body.event)
    .then(data => {
      createContact(data)
        .then(() => {
          let number = `+${data.userData.number}`
          if (data.messageData.constructor === Object && Object.keys(data.messageData).length > 0) {
            let query = [
              { $match: { 'whatsApp.accessToken': data.accessToken } }
            ]
            callApi(`companyprofile/aggregate`, 'post', query)
              .then(companies => {
                companies.forEach(async (company) => {
                  if (data.messageData.componentType === 'text' && data.messageData.text === 'Hi') {
                    let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot(company._id)
                    if (chatbot) {
                      let mainMenuBlock = await messageBlockDataLayer.findOneMessageBlock({ 'module.id': chatbot._id, 'module.type': 'whatsapp_chatbot', 'title': 'Main Menu' })
                      for (let message of mainMenuBlock.payload) {
                        let chatbotResponse = {
                          whatsApp: {
                            accessToken: data.accessToken
                          },
                          recipientNumber: number,
                          payload: message
                        }
                        whatsAppMapper.whatsAppMapper(req.body.provider, ActionTypes.SEND_CHAT_MESSAGE, chatbotResponse)
                      }
                    }
                  }
                  callApi(`whatsAppContacts/query`, 'post', { number: number, companyId: company._id })
                    .then(contact => {
                      contact = contact[0]
                      if (contact && contact.isSubscribed) {
                        storeChat(number, company.whatsApp.businessNumber, contact, data.messageData)
                      }
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
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
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/aggregate`, 'post', query, 'accounts')
      .then(companies => {
        if (companies && companies.length > 0) {
          companies.forEach((company, index) => {
            callApi(`whatsAppContacts/query`, 'post', { number: number, companyId: company._id }, 'accounts')
              .then(contact => {
                contact = contact[0]
                if (!contact) {
                  callApi(`whatsAppContacts`, 'post', {
                    name: name && name !== '' ? name : number,
                    number: number,
                    companyId: company._id
                  }, 'accounts')
                    .then(contact => {
                      if (index === companies.length - 1) {
                        resolve()
                      }
                    })
                    .catch(() => {
                      if (index === companies.length - 1) {
                        resolve()
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
                    resolve()
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
        let query = { _id: contact._id }
        let updatePayload = { last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now() }
        let incrementPayload = { $inc: { unreadCount: 1, messagesCount: 1 } }
        updateWhatsAppContact(query, updatePayload, incrementPayload, {})
      })
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
