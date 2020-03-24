const logger = require('../../../components/logger')
const TAG = 'twilio.controller.js'
const async = require('async')
const config = require('../../../config/environment')
const { callApi } = require('../utility')
const middleware = require('./middleware')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.sendSMS = function (req, res) {
  const numbers = req.body.numbers
  const from = config.twilio.number
  let success = 0
  let failed = 0
  async.each(numbers, function (number, cb) {
    // map code to template
    req.twilioClient.messages
      .create({
        body: 'template',
        from,
        to: number
      })
      .then(response => {
        logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
        success++
        cb()
      })
      .catch(error => {
        logger.serverLog(TAG, `error at sending message ${error}`, 'error')
        failed++
        cb()
      })
  }, function () {
    return res.status(201).json({status: 'success', payload: {success, failed}})
  })
}

exports.receiveSMS = function (req, res) {
  // const client = require('twilio')(config.twilio.sid, config.twilio.token)
  // map response to template and call lab work api
  return res.status(200).json({status: 'success'})
}

exports.verifyNumber = function (req, res) {
  callApi('companyprofile/query', 'post', {_id: req.user.companyId})
    .then(company => {
      if (company) {
        const twilioClient = require('twilio')(company.twilio.accountSID, company.twilio.authToken)
        middleware.verifyPhoneNumber(req.body.number, twilioClient)
          .then(valid => {
            sendSuccessResponse(res, 200, null, 'Number is valid')
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 403, null, 'Please enter a valid number of format E.164')
          })
      } else {
        sendErrorResponse(res, 404, null, 'User does not belong to any company')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, null, 'An unexpected error occurred. Please try again later')
    })
}
