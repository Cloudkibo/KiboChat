const logger = require('../../../components/logger')
const TAG = 'twilio.controller.js'
const async = require('async')
const config = require('../../../config/environment')
const { callApi } = require('../utility')
const middleware = require('./middleware')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const MessagingResponse = require('twilio').twiml.MessagingResponse

exports.sendSMS = function (req, res) {
  const numbers = req.body.numbers
  const from = config.twilio.number
  let success = 0
  let failed = 0
  async.each(numbers, function (number, cb) {
    // map code to template
    req.twilioClient.messages
      .create({
        body: req.body.template_code,
        from,
        to: number
      })
      .then(response => {
        success++
        cb()
      })
      .catch(error => {
        const message = error || 'error at sending message'
        logger.serverLog(message, `${TAG}: exports.sendSMS`, req.body, {user: req.user}, 'error')
        failed++
        cb()
      })
  }, function () {
    return res.status(201).json({status: 'success', payload: {success, failed}})
  })
}

exports.receiveSMS = function (req, res) {
  const twiml = new MessagingResponse()
  twiml.message('Thanks')
  // map response to template and call lab work api
  callApi('twilio/receiveMessage', 'post', req.body, 'COVIS')
    .then(result => {})
    .catch(err => {
      const message = err || 'error at receiving message'
      logger.serverLog(message, `${TAG}: exports.receiveSMS`, req.body, {}, 'error')
    })
  res.writeHead(200, { 'Content-Type': 'text/xml' })
  res.end(twiml.toString())
}

exports.verifyNumber = function (req, res) {
  callApi('companyprofile/query', 'post', {_id: req.user.companyId})
    .then(company => {
      if (company) {
        const twilioClient = require('twilio')(company.sms.accountSID, company.sms.authToken)
        middleware.verifyPhoneNumber(req.body.number, twilioClient)
          .then(valid => {
            sendSuccessResponse(res, 200, null, 'Number is valid')
          })
          .catch(err => {
            const message = err || 'An unexpected error occurred. Please try again later'
            logger.serverLog(message, `${TAG}: exports.verifyNumber`, req.body, {user: req.user}, 'info')
            sendErrorResponse(res, 403, null, 'Please enter a valid number of format E.164')
          })
      } else {
        sendErrorResponse(res, 404, null, 'User does not belong to any company')
      }
    })
    .catch(err => {
      const message = err || 'An unexpected error occurred. Please try again later'
      logger.serverLog(message, `${TAG}: exports.verifyNumber`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, null, 'An unexpected error occurred. Please try again later')
    })
}
