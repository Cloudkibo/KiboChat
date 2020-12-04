'use strict'
// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/passwordresettoken/passwordresettoken.controller.js'
const utility = require('../utility')

function isPasswordWrong (err) {
  if (err === `Wrong current password.`) {
    return true
  } else {
    return false
  }
}
exports.change = function (req, res) {
  utility.callApi('reset_password/change', 'post', {old_password: req.body.old_password, new_password: req.body.new_password}, 'accounts', req.headers.authorization)
    .then((result) => {
      res.status(200).json({status: 'success', description: result})
    })
    .catch((err) => {
      let userError = isPasswordWrong(err)
      if (!userError) {
        const message = err || 'Error in Password change'
        logger.serverLog(message, `${TAG}: exports.change`, req.body, {user: req.user}, 'error')
      }
      res.status(500).json({status: 'failed', description: err})
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
