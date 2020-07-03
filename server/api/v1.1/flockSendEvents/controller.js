const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const TAG = '/api/v1/flockSendEvents/controller.js'

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messageData = logicLayer.getPayload(req.body)
  let number = `+${req.body.phone_number}`
  if (messageData.constructor === Object && Object.keys(messageData).length > 0) {
    let query = [
      {$match: {'flockSendWhatsApp.token': req.body.user_id}}
    ]
    callApi(`companyprofile/aggregate`, 'post', query)
      .then(companies => {
        companies.forEach((company) => {
          callApi(`whatsAppContacts/query`, 'post', {number: number, companyId: company._id})
            .then(contact => {
              contact = contact[0]
              if (contact && contact.isSubscribed) {
                storeChat(number, company.flockSendWhatsApp.number, contact, messageData)
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
        let query = {_id: contact._id}
        let updatePayload = {last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now()}
        let incrementPayload = {$inc: { unreadCount: 1, messagesCount: 1 }}
        updateWhatsAppContact(query, updatePayload, incrementPayload, {})
      })
  })
}
function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForUpdate, options: options})
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForIncrement, options: options})
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
}
