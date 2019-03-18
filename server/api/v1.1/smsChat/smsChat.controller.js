const logger = require('../../../components/logger')
const logicLayer = require('./smsChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const { callApi } = require('../utility')

exports.create = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let MessageObject = logicLayer.prepareChat(req.body, companyUser)
      callApi(`smsChat`, 'post', MessageObject, '', 'kibochat')
        .then(message => {
          let subscriberData = {
            query: {_id: req.body.contactId},
            newPayload: {last_activity_time: Date.now()},
            options: {}
          }
          callApi(`contacts/update`, 'put', subscriberData, req.headers.authorization)
            .then(updated => {
              let accountSid = companyUser.companyId.twilio.accountSID
              let authToken = companyUser.companyId.twilio.authToken
              let client = require('twilio')(accountSid, authToken)
              client.messages
                .create({
                  body: req.body.payload,
                  from: req.body.senderNumber,
                  to: req.body.recipientNumber
                })
                .then(response => {
                  logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
                  return res.status(200)
                    .json({status: 'success', payload: message})
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to send message ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to update contact ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create smsChat ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
