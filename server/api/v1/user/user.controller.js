const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/user/user.controller.js'
const util = require('util')
const needle = require('needle')
const config = require('./../../../config/environment/index')

exports.index = function (req, res) {
  utility.callApi(`user`, 'get', {}, 'accounts', req.headers.authorization)
    .then(user => {
      return res.status(200).json({
        status: 'success',
        payload: user
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while fetching user details ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetching user details ${JSON.stringify(error)}`
      })
    })
}

exports.updateChecks = function (req, res) {
  utility.callApi(`user/updateChecks`, 'post', req.body, 'accounts', req.headers.authorization) // call updateChecks in accounts
    .then(user => {
      return res.status(200).json({
        status: 'success',
        payload: user
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while updating checks ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update checks ${JSON.stringify(error)}`
      })
    })
}

exports.updateSkipConnect = function (req, res) {
  utility.callApi(`user/updateSkipConnect`, 'get', 'accounts', req.headers.authorization)
    .then(user => {
      return res.status(200).json({
        status: 'success',
        payload: user
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error at updateSkipConnect  ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to updateSkipConnect ${JSON.stringify(error)}`
      })
    })
}

exports.updateMode = function (req, res) {
  utility.callApi(`user/updateMode`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(user => {
      return res.status(200).json({
        status: 'success',
        payload: user
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while updating mode ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update mode ${JSON.stringify(error)}`
      })
    })
}

exports.fbAppId = function (req, res) {
  return res.status(200).json({status: 'success', payload: config.facebook.clientID})
}

exports.authenticatePassword = function (req, res) {
  utility.callApi(`user/authenticatePassword`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(status => {
      return res.status(200).json({
        status: 'success',
        payload: status
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while authenticating password ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to authenticate password ${JSON.stringify(error)}`
      })
    })
}

exports.addAccountType = function (req, res) {
  utility.callApi(`user/addAccountType`, 'get', {}, 'accounts', req.headers.authorization)
    .then(status => {
      return res.status(200).json({
        status: 'success',
        payload: status
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while adding account type ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to add account type ${JSON.stringify(error)}`
      })
    })
}

exports.enableDelete = function (req, res) {
  utility.callApi(`user/gdpr`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(updatedUser => {
      return res.status(200).json({
        status: 'success',
        payload: updatedUser
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while enabling GDPR delete ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to enable GDPR delete ${JSON.stringify(error)}`
      })
    })
}

exports.cancelDeletion = function (req, res) {
  utility.callApi(`user/gdpr`, 'get', {}, 'accounts', req.headers.authorization)
    .then(updatedUser => {
      return res.status(200).json({
        status: 'success',
        payload: updatedUser
      })
    }).catch(error => {
      logger.serverLog(TAG, `Error while disabling GDPR delete ${util.inspect(error)}`)
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to disable GDPR delete ${JSON.stringify(error)}`
      })
    })
}

exports.validateUserAccessToken = function (req, res) {
  if (req.user.facebookInfo) {
    needle.get(`https://graph.facebook.com/v2.6/me?access_token=${req.user.facebookInfo.fbToken}`, (err, response) => {
      if (err) {
        res.status(500).json({status: 'failed', payload: JSON.stringify(err)})
      } else if (response.body.error) {
        res.status(500).json({status: 'failed', payload: response.body})
      } else {
        res.status(200).json({status: 'success', payload: 'User Access Token validated successfully!'})
      }
    })
  } else {
    res.status(200).json({status: 'success', payload: 'Facebook account is not connected.'})
  }
}

exports.updateShowIntegrations = function (req, res) {
  let showIntegrations = req.body.showIntegrations
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {showIntegrations}, options: {}})
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        payload: 'Updated Successfully!'
      })
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: err})
    })
}

exports.disconnectFacebook = function (req, res) {
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {connectFacebook: false}, options: {}})
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        payload: 'Updated Successfully!'
      })
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: err})
    })
}
exports.updatePlatform = function (req, res) {
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.platform}, options: {}})
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        payload: 'Updated Successfully!'
      })
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: err})
    })
}
