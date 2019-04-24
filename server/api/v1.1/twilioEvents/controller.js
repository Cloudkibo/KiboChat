const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  console.log('req.body', req.body)
  callApi(`companyprofile/query`, 'post', {'twilio.accountSID': req.body.AccountSid})
    .then(company => {
      console.log('company found', company)
      callApi(`user/query`, 'post', {_id: company.ownerId})
        .then(user => {
          callApi(`contacts/query`, 'post', {number: req.body.From, companyId: company._id})
            .then(contact => {
              console.log('contacts found', contact)
              contact = contact[0]
              if (contact.isSubscribed || req.body.Body.toLowerCase() === 'start') {
                let MessageObject = {
                  senderNumber: req.body.From,
                  recipientNumber: req.body.To,
                  contactId: contact._id,
                  companyId: contact.companyId,
                  payload: {componentType: 'text', text: req.body.Body},
                  status: 'unseen',
                  format: 'twilio'
                }
                callApi(`smsChat`, 'post', MessageObject, '', 'kibochat')
                  .then(message => {
                    let subscriberData = {
                      query: {_id: contact._id},
                      newPayload: {last_activity_time: Date.now(), hasChat: true},
                      options: {}
                    }
                    callApi(`contacts/update`, 'put', subscriberData)
                      .then(updated => {
                      })
                      .catch(error => {
                        logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
                      })
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to create sms ${JSON.stringify(error)}`)
                  })
                if (req.body.Body !== '' && (req.body.Body.toLowerCase() === 'unsubscribe' || req.body.Body.toLowerCase() === 'stop')) {
                  handleUnsub(user, company, contact, req.body)
                } else if (req.body.Body !== '' && req.body.Body.toLowerCase() === 'start' && !contact.isSubscribed) {
                  handleSub(user, company, contact, req.body)
                }
              }
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to fetch user ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch company ${JSON.stringify(error)}`)
    })
}
function handleUnsub (user, company, contact, body) {
  let accountSid = company.twilio.accountSID
  let authToken = company.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  let unsubscribeMessage = 'You have unsubscribed from our broadcasts. Send "start" to subscribe again'
  client.messages
    .create({
      body: unsubscribeMessage,
      from: body.To,
      to: contact.number
    })
    .then(response => {
      console.log('response from smstwiliomsg', response)
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`)
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: unsubscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`smsChat`, 'post', message, '', 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: false},
        options: {}
      }
      callApi(`contacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
        })
    })
}
function handleSub (user, company, contact, body) {
  let accountSid = company.twilio.accountSID
  let authToken = company.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  let subscribeMessage = 'Thank you for subscribing again'
  client.messages
    .create({
      body: subscribeMessage,
      from: body.To,
      to: contact.number
    })
    .then(response => {
      console.log('response from smstwiliomsg', response)
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`)
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: subscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`smsChat`, 'post', message, '', 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: true},
        options: {}
      }
      callApi(`contacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
        })
    })
}
exports.whatsApp = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let from = req.body.From.substring(9)
  let to = req.body.To.substring(9)
  callApi(`companyprofile/query`, 'post', {'twilioWhatsApp.accountSID': req.body.AccountSid})
    .then(company => {
      callApi(`whatsAppContacts/query`, 'post', {number: from, companyId: company._id})
        .then(contact => {
          if (contact.length > 0) {
            contact = contact[0]
            if (contact.isSubscribed || req.body.Body.toLowerCase() === 'start') {
              storeChat(from, to, req.body, contact, company)
            }
          } else {
            callApi(`whatsAppContacts`, 'post', {
              name: 'WhatsApp Contact',
              number: from,
              companyId: company._id,
              hasChat: true})
              .then(contact => {
                storeChat(from, to, req.body, contact, company)
              })
          }
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to company profile ${JSON.stringify(error)}`)
    })
}
function storeChat (from, to, body, contact, company) {
  callApi(`user/query`, 'post', {_id: company.ownerId})
    .then(user => {
      user = user[0]
      let messageData = logicLayer.prepareChat(from, to, body, contact)
      callApi(`whatsAppChat`, 'post', messageData.messageObject, '', 'kibochat')
        .then(message => {
          let subscriberData = {
            query: {_id: contact._id},
            newPayload: {last_activity_time: Date.now(), hasChat: true},
            options: {}
          }
          callApi(`whatsAppContacts/update`, 'put', subscriberData)
            .then(updated => {
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
            })
        })
      if (messageData.otherPayload) {
        callApi(`whatsAppChat`, 'post', messageData.otherPayload, '', 'kibochat')
          .then(message => {
            let subscriberData = {
              query: {_id: contact._id},
              newPayload: {last_activity_time: Date.now(), hasChat: true},
              options: {}
            }
            callApi(`whatsAppContacts/update`, 'put', subscriberData)
              .then(updated => {
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
              })
          })
      }
      if (body.Body !== '' && (body.Body.toLowerCase() === 'unsubscribe' || body.Body.toLowerCase() === 'stop')) {
        handleUnsubscribe(contact, company, user)
      } else if (body.Body !== '' && body.Body.toLowerCase() === 'start' && !contact.isSubscribed) {
        handleSubscribe(contact, company, user)
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch user ${error}`)
    })
}

function handleUnsubscribe (contact, company, user) {
  let accountSid = company.twilioWhatsApp.accountSID
  let authToken = company.twilioWhatsApp.authToken
  let client = require('twilio')(accountSid, authToken)
  let unsubscribeMessage = 'You have unsubscribed from our broadcasts. Send "start" to subscribe again'
  client.messages
    .create({
      body: unsubscribeMessage,
      from: `whatsapp:${company.twilioWhatsApp.sandboxNumber}`,
      to: `whatsapp:${contact.number}`
    })
    .then(response => {
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`)
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: unsubscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`whatsAppChat`, 'post', message, '', 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: false},
        options: {}
      }
      callApi(`whatsAppContacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
        })
    })
}

function handleSubscribe (contact, company, user) {
  let accountSid = company.twilioWhatsApp.accountSID
  let authToken = company.twilioWhatsApp.authToken
  let client = require('twilio')(accountSid, authToken)
  let subscribeMessage = 'Thank you for subscribing again.'
  client.messages
    .create({
      body: subscribeMessage,
      from: `whatsapp:${company.twilioWhatsApp.sandboxNumber}`,
      to: `whatsapp:${contact.number}`
    })
    .then(response => {
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`)
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: subscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`whatsAppChat`, 'post', message, '', 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: true},
        options: {}
      }
      callApi(`whatsAppContacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`)
        })
    })
}
