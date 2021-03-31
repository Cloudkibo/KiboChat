const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/user/user.controller.js'
const cookie = require('cookie')
const config = require('./../../../config/environment/index')
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
          const message = error || 'Error while fetching companyUser details'
          logger.serverLog(message, `${TAG}: exports.index`, {}, {user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetching companyUser details ${JSON.stringify(error)}`)
        })
    }).catch(error => {
      const message = error || 'Error while fetching user details'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {}, 'error')
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
      const message = error || 'Error while updating checks'
      logger.serverLog(message, `${TAG}: exports.updateChecks`, req.body, {user: req.user}, 'error')
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
      const message = error || 'Error at updateSkipConnect'
      logger.serverLog(message, `${TAG}: exports.updateSkipConnect`, {}, {user: req.user}, 'error')
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
      const message = error || 'Error while updating mode'
      logger.serverLog(message, `${TAG}: exports.updateMode`, req.body, {user: req.user}, 'error')
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
      const message = error || 'Error while authenticating password'
      logger.serverLog(message, `${TAG}: exports.authenticatePassword`, {}, {user: req.user}, 'error')
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
      const message = error || 'Error while adding account type'
      logger.serverLog(message, `${TAG}: exports.addAccountType`, {}, {user: req.user}, 'error')
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
      const message = error || 'Error while enabling GDPR delete'
      logger.serverLog(message, `${TAG}: exports.enableDelete`, req.body, {user: req.user}, 'error')
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
      const message = error || 'Error while disabling GDPR delete'
      logger.serverLog(message, `${TAG}: exports.enableDelete`, {}, {user: req.user}, 'error')
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
      const message = err || 'Error while disabling GDPR delete'
      logger.serverLog(message, `${TAG}: exports.validateFacebookConnected`, {}, {user: req.user}, 'error')
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
        const message = err || 'Error while validating access token'
        logger.serverLog(message, `${TAG}: exports.validateUserAccessToken`, {}, {user: req.user, dataToSend},
          message.message && message.message.includes('Facebook Info not found') ? 'info' : 'error')
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
            const message = err || 'Error while validating access token'
            logger.serverLog(message, `${TAG}: exports.validateUserAccessToken`, {}, {user: req.user, dataToSend},
              message.message && message.message.includes('Facebook Info not found') ? 'info' : 'error')
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
            if (response.body.error.code && response.body.error.code !== 190) {
            } else {
              logger.serverLog(TAG, `Session has been invalidated ${JSON.stringify(response.body.error)}`, 'info')
            }
            reject(response.body.error)
          } else {
            resolve('User Access Token validated successfully!')
          }
        })
        .catch((err) => {
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
      const message = err || 'Error updating user object'
      logger.serverLog(message, `${TAG}: exports.updateShowIntegrations`, req.body, {user: req.user}, 'error')
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
              const message = err || 'Error updating user object'
              logger.serverLog(message, `${TAG}: exports.disconnectFacebook`, {}, {user: req.user}, 'error')
              sendErrorResponse(res, 500, err)
            })
        }).catch(err => {
          const message = err || 'error in disconnect'
          logger.serverLog(message, `${TAG}: exports.disconnectFacebook`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      const message = err || 'error in fetching company user'
      logger.serverLog(message, `${TAG}: exports.disconnectFacebook`, {}, {user: req.user}, 'error')
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
      const message = err || 'error in updating user'
      logger.serverLog(message, `${TAG}: exports.updatePlatform`, {}, {user: req.user}, 'error')
      res.status(500).json({ status: 'failed', payload: err })
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
      res.status(500).json({status: 'failed', payload: `failed to sendLogoutEvent ${err}`})
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
      } else {
        shopifyDataLayer.createShopifyIntegration(shopifyPayload)
          .then(savedStore => {
          })
          .catch(err => {
            const message = err || 'shopify store integration creation error'
            logger.serverLog(message, `${TAG}: exports.saveShopifyIntegration`, {}, { shopifyPayload }, 'error')
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
      } else {
        bigCommerceDataLayer.createBigCommerceIntegration(bigCommercePayload)
          .then(savedStore => {
          })
          .catch(err => {
            const message = err || 'bigcommerce store integration creation error'
            logger.serverLog(message, `${TAG}: exports.saveBigCommerceIntegration`, {}, {bigCommercePayload}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'bigcommerce store integration query error'
      logger.serverLog(message, `${TAG}: exports.saveBigCommerceIntegration`, {}, {bigCommercePayload}, 'error')
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
      const message = err || 'failed to sendLogoutEvent'
      logger.serverLog(message, `${TAG}: exports.logout`, {}, {user: req.user}, 'error')
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
