const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  callApi(`contacts/query`, 'post', {number: req.body.From})
    .then(contact => {
      contact = contact[0]
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
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`)
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
          } else {
            callApi(`whatsAppContacts`, 'post', {
              name: 'WhatsApp Contact',
              number: from,
              companyId: company._id,
              hasChat: true})
              .then(contact => {
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
