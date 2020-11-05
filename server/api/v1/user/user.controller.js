const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/user/user.controller.js'
const util = require('util')
const cookie = require('cookie')
const config = require('./../../../config/environment/index')
const { sendOpAlert } = require('../../global/operationalAlert')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const shopifyDataLayer = require('../../v1.1/shopify/shopify.datalayer.js')
const bigCommerceDataLayer = require('../../v1.1/bigcommerce/bigcommerce.datalayer.js')

exports.index = function (req, res) {
  utility.callApi(`user`, 'get', {}, 'accounts', req.headers.authorization)
    .then(user => {
      utility.callApi(`companyUser/query`, 'post', { userId: user._id }, 'accounts', req.headers.authorization)
        .then(companyUser => {
          var superUser = {}
          user.expoListToken = companyUser.expoListToken
          res.cookie('userId', user._id)
          res.cookie('companyId', companyUser.companyId)
          // shopify redirect work as it doesn't allow to add
          // shop URL in UI so this is just doing it based on
          // cookies
          if (req.headers.cookie && cookie.parse(req.headers.cookie).shopifyToken) {
            let shop = cookie.parse(req.headers.cookie).installByShopifyStore
            let shopToken = cookie.parse(req.headers.cookie).shopifyToken
            res.clearCookie('shopifyToken')
            res.clearCookie('installByShopifyStore')
            res.cookie('shopifySetupState', 'completedAfterLogin')
            saveShopifyIntegration(shop, shopToken, user._id, companyUser.companyId)
          }
          // bigcommerce redirect work
          if (req.headers.cookie && cookie.parse(req.headers.cookie).bigCommerceSetupState) {
            let bigCommercePayload = JSON.parse(cookie.parse(req.headers.cookie).bigCommerceAuthPayload)
            res.clearCookie('bigCommerceSetupState')
            res.clearCookie('bigCommerceAuthPayload')
            saveBigCommerceIntegration(bigCommercePayload, user._id, companyUser.companyId)
          }
          if (req.superUser) {
            superUser = req.superUser
          } else {
            superUser = null
          }
          sendSuccessResponse(res, 200, { user, superUser })
        }).catch(error => {
          logger.serverLog(TAG, `Error while fetching companyUser details ${util.inspect(error)}`, 'error')

          sendErrorResponse(res, 500, `Failed to fetching companyUser details ${JSON.stringify(error)}`)
        })
    }).catch(error => {
      logger.serverLog(TAG, `Error while fetching user details ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to fetching user details ${JSON.stringify(error)}`)
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
  return res.status(200).json({ status: 'success', payload: config.facebook.clientID })
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

exports.validateFacebookConnected = function (req, res) {
  let companyAggregation = [
    { '$match': { _id: req.user.companyId } },
    { '$lookup': { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'user' } },
    { '$unwind': '$user' }
  ]
  utility.callApi(`companyprofile/aggregate`, 'post', companyAggregation, 'accounts', req.headers.authorization)
    .then(company => {
      company = company[0]
      let dataTosend = {
        role: req.user.role,
        buyerInfo: {
          connectFacebook: company.user.connectFacebook,
          buyerName: company.user.name,
          buyerFbName: company.user.facebookInfo && company.user.facebookInfo.name ? company.user.facebookInfo.name : '',
          email: company.user.email,
          profilePic: company.user.facebookInfo && company.user.facebookInfo.profilePic ? company.user.facebookInfo.profilePic : ''
        }
      }
      sendSuccessResponse(res, 200, dataTosend)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.validateUserAccessToken = function (req, res) {
  if (req.user.role === 'buyer') {
    _checkAcessTokenFromFb(req.user.facebookInfo, req)
      .then(result => {
        sendSuccessResponse(res, 200, 'User Access Token validated successfully!')
      })
      .catch((err) => {
        let dataToSend = {
          error: err,
          buyerInfo: {
            buyerName: req.user.name,
            buyerFbName: req.user.facebookInfo && req.user.facebookInfo.name ? req.user.facebookInfo.name : '',
            email: req.user.email,
            profilePic: req.user.facebookInfo && req.user.facebookInfo.profilePic ? req.user.facebookInfo.profilePic : ''
          }
        }
        sendErrorResponse(res, 500, dataToSend)
      })
  } else {
    let companyAggregation = [
      { '$match': { _id: req.user.companyId } },
      { '$lookup': { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'user' } },
      { '$unwind': '$user' }
    ]
    utility.callApi(`companyprofile/aggregate`, 'post', companyAggregation, 'accounts', req.headers.authorization)
      .then(company => {
        company = company[0]
        _checkAcessTokenFromFb(company.user.facebookInfo, req)
          .then(result => {
            sendSuccessResponse(res, 200, 'User Access Token validated successfully!')
          })
          .catch((err) => {
            let dataToSend = {
              error: err,
              buyerInfo: {
                buyerName: company.user.name,
                buyerFbName: company.user.facebookInfo && company.user.facebookInfo.name ? company.user.facebookInfo.name : '',
                email: company.user.email,
                profilePic: company.user.facebookInfo && company.user.facebookInfo.profilePic ? company.user.facebookInfo.profilePic : ''
              }
            }
            sendErrorResponse(res, 500, dataToSend)
          })
      })
  }
}

function _checkAcessTokenFromFb (facebookInfo, req) {
  return new Promise(function (resolve, reject) {
    if (facebookInfo) {
      facebookApiCaller('v6.0', `me?access_token=${facebookInfo.fbToken}`, 'get')
        .then(response => {
          if (response.body.error) {
            if (response.body.error.code && response.body.error.code !== '190') {
              sendOpAlert(response.body.error, 'error validating user access token', '', req.user._id, req.user.companyId)
            } else {
              logger.serverLog(TAG, `Session has been invalidated ${JSON.stringify(response.body.error)}`, 'info')
            }
            reject(response.body.error)
          } else {
            resolve('User Access Token validated successfully!')
          }
        })
        .catch((err) => {
          sendOpAlert(err, 'error validating user access token', '', req.user._id, req.user.companyId)
          reject(err)
        })
    } else {
      reject(new Error('Facebook Info not found'))
    }
  })
}

exports.updateShowIntegrations = function (req, res) {
  let showIntegrations = req.body.showIntegrations
  utility.callApi('user/update', 'post', { query: { _id: req.user._id }, newPayload: { showIntegrations }, options: {} })
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        payload: 'Updated Successfully!'
      })
    })
    .catch(err => {
      res.status(500).json({ status: 'failed', payload: err })
    })
}

exports.disconnectFacebook = function (req, res) {
  utility.callApi(`companyProfile/query`, 'post', { ownerId: req.user._id })
    .then(companyProfile => {
      let updated = { connectFacebook: false }
      if (companyProfile.twilio) {
        updated.platform = 'sms'
      } else if (companyProfile.whatsApp && !(companyProfile.whatsApp.connected === false)) {
        updated.platform = 'whatsApp'
      } else {
        updated.platform = ''
      }
      utility.callApi(`companyUser/queryAll`, 'post', { companyId: req.user.companyId }, 'accounts')
        .then(companyUsers => {
          let userIds = companyUsers.map(companyUser => companyUser.userId._id)
          utility.callApi(`user/update`, 'post', { query: { _id: { $in: userIds } }, newPayload: updated, options: { multi: true } })
            .then(data => {
              sendSuccessResponse(res, 200, 'Updated Successfully!')
            })
            .catch(err => {
              sendErrorResponse(res, 500, err)
            })
        }).catch(err => {
          logger.serverLog(TAG, JSON.stringify(err), 'error')
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      res.status(500).json({ status: 'failed', payload: err })
    })
}
exports.updatePlatform = function (req, res) {
  utility.callApi('user/update', 'post', { query: { _id: req.user._id }, newPayload: { platform: req.body.platform }, options: {} })
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        payload: 'Updated Successfully!'
      })
    })
    .catch(err => {
      res.status(500).json({ status: 'failed', payload: err })
    })
}

function saveShopifyIntegration (shop, shopToken, userId, companyId) {
  const shopifyPayload = {
    userId,
    companyId,
    shopUrl: shop,
    shopToken
  }
  shopifyDataLayer.findOneShopifyIntegration({ companyId })
    .then(shopifyIntegration => {
      if (shopifyIntegration) {
        logger.serverLog(TAG, 'shopify integration already exists', 'debug')
      } else {
        shopifyDataLayer.createShopifyIntegration(shopifyPayload)
          .then(savedStore => {
            logger.serverLog(TAG, 'shopify store integration created', 'debug')
          })
          .catch(err => {
            logger.serverLog(TAG, 'shopify store integration creation error' + err, 'error')
          })
      }
    })
}

function saveBigCommerceIntegration (payload, userId, companyId) {
  const bigCommercePayload = {
    userId,
    companyId,
    payload,
    shopToken: payload.access_token
  }
  bigCommerceDataLayer.findOneBigCommerceIntegration({ companyId })
    .then(bigCommerceIntegration => {
      if (bigCommerceIntegration) {
        logger.serverLog(TAG, 'bigcommerce integration already exists', 'debug')
      } else {
        bigCommerceDataLayer.createBigCommerceIntegration(bigCommercePayload)
          .then(savedStore => {
            logger.serverLog(TAG, 'bigcommerce store integration created', 'debug')
          })
          .catch(err => {
            logger.serverLog(TAG, 'bigcommerce store integration creation error' + JSON.stringify(err), 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, 'bigcommerce store integration query error' + JSON.stringify(err), 'error')
    })
}

exports.logout = function (req, res) {
  utility.callApi(`users/receivelogout`, 'get', {}, 'kiboengage', req.headers.authorization)
    .then(response => {
      return res.status(200).json({
        status: 'success',
        payload: 'send response successfully!'
      })
    }).catch(err => {
      console.log('error', err)
      res.status(500).json({ status: 'failed', payload: `failed to sendLogoutEvent ${err}` })
    })
}

exports.receivelogout = function (req, res) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: req.user.companyId,
    body: {
      action: 'logout'
    }
  })
  return res.status(200).json({
    status: 'success',
    payload: 'recieved logout event!'
  })
}
