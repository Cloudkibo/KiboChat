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
      console.log('contact', contact)
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
          console.log('message saved', message)
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
