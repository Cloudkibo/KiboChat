'use strict'
// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/passwordresettoken/passwordresettoken.controller.js'
const config = require('./../../../config/environment/index')
let crypto = require('crypto')
let path = require('path')
const utility = require('../utility')

exports.change = function (req, res) {
  utility.callApi('reset_password/change', 'post', {old_password: req.body.old_password, new_password: req.body.new_password}, req.headers.authorization)
    .then((result) => {
      console.log('result', result)
      logger.serverLog(TAG, 'result from invite endpoint accounts')
      logger.serverLog(TAG, result)
      res.status(200).json({status: 'success', description: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, err)
      console.log('err.status', err.error.status)
      console.log('err.payload', err.error.payload)
      res.status(200).json({status: 'failed', description: err.error.description})
    })
  /* let userId = req.user._id
  let oldPass = String(req.body.old_password)
  let newPass = String(req.body.new_password)

  User.findById(userId, function (err, user) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (user.authenticate(oldPass)) {
      user.password = newPass
      user.save(function (err) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        res.status(200).json(
          {status: 'success', description: 'Password changed successfully.'})
      })
    } else {
      res.status(403)
        .json({status: 'failed', description: 'Wrong current password.'})
    }
  }) */
}
