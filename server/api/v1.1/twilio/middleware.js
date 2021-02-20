/**
 * Created by sojharo on 24/07/2017.
 */
'use strict'
const compose = require('composable-middleware')
const config = require('../../../config/environment')
const async = require('async')

function validateNumbers () {
  return compose()
    .use((req, res, next) => {
      const client = require('twilio')(config.twilio.sid, config.twilio.token)
      const numbers = req.body.numbers
      const invalidNumbers = []
      async.each(numbers, function (number, cb) {
        verifyPhoneNumber(number, client)
          .then(valid => {
            cb()
          })
          .catch(err => {
            invalidNumbers.push(number)
            cb()
          })
      }, function () {
        if (invalidNumbers.length > 0) {
          return res.status(400).json({
            status: 'failed',
            error: {
              error_code: 400,
              message: `Invalid numbers found ${invalidNumbers}. Please send valid numbers of format E.164.`
            }
          })
        } else {
          req.twilioClient = client
          next()
        }
      })
    })
}

/* eslint-disable */
const verifyPhoneNumber = (number, client) => {
  return client.lookups.phoneNumbers(number).fetch()
    .then(numberData => true, err => false)
}
/* eslint-enable */

exports.validateNumbers = validateNumbers
exports.verifyPhoneNumber = verifyPhoneNumber
