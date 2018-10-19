/**
 * Created by sojharo on 24/07/2017.
 */
'use strict'

const config = require('../config/environment')
const compose = require('composable-middleware')
const apiCaller = require('../api/v1/utility')
const needle = require('needle')
const _ = require('lodash')
const util = require('util')
const logger = require('../components/logger')
const requestPromise = require('request-promise')
const TAG = 'auth/auth.service.js'

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function isAuthenticated () {
  return compose()
  // Validate jwt or api keys
    .use((req, res, next) => {
      if (req.headers.hasOwnProperty('app_id')) {
        validateApiKeys(req, res, next)
      } else {
        logger.serverLog(TAG, `request ${util.inspect(req.headers)}`)
        // allow access_token to be passed through query parameter as well
        if (req.query && req.query.hasOwnProperty('access_token')) {
          req.headers.authorization = `Bearer ${req.query.access_token}`
        }

        let headers = {
          'content-type': 'application/json',
          'Authorization': req.headers.authorization
        }

        let path = config.API_URL_ACCOUNTS.slice(0, config.API_URL_ACCOUNTS.length - 7)

        let options = {
          method: 'GET',
          uri: `${path}/auth/verify`,
          headers,
          json: true
        }

        requestPromise(options)
          .then(result => {
            logger.serverLog(TAG, `response got ${result}`)
            if (result.status === 'success') {
              req.user = result.user
              next()
            } else {
              return res.status(401)
                .json({status: 'failed', description: 'Unauthorized'})
            }
          })
          .catch(err => {
            return res.status(500)
              .json({status: 'failed', description: `Internal Server Error: ${err}`})
          })
      }
    })
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function isAuthorizedSuperUser () {
  return compose()
    .use(function meetsRequirements (req, res, next) {
      if (req.user.isSuperUser) {
        next()
      } else {
        res.send(403)
      }
    })
}

/**
 * Checks if the user role meets the minimum requirements of the route
 * Note: maybe we don't use it
 */
function hasRole (roleRequired) {
  if (!roleRequired) throw new Error('Required role needs to be set')

  return compose()
    .use(function meetsRequirements (req, res, next) {
      if (config.userRoles.indexOf(req.user.role) >=
        config.userRoles.indexOf(roleRequired)) {
        next()
      } else {
        res.send(403)
      }
    })
}

function hasRequiredPlan (planRequired) {
  if (!planRequired) throw new Error('Required plan needs to be set')
  if (!(typeof planRequired === 'object' &&
    planRequired.length)) throw new Error('Required plan must be of type array')

  return compose().use(function meetsRequirements (req, res, next) {
    if (planRequired.indexOf(req.user.plan.unique_ID) > -1) {
      next()
    } else {
      res.send(403)
    }
  })
}

function doesPlanPermitsThisAction (action) {
  if (!action) throw new Error('Action needs to be set')

  return compose().use(function meetsRequirements (req, res, next) {
    console.log('user: ', JSON.stringify(req.user.plan))
    apiCaller.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.plan.plan_id._id}, req.headers.authorization)
      .then(plan => {
        plan = plan[0]
        if (!plan) {
          return res.status(500)
            .json({
              status: 'failed',
              description: 'Fatal Error. Plan not set. Please contact support.'
            })
        }
        if (req.user && req.user.plan && plan[action]) {
          next()
        } else {
          res.status(403)
            .json({
              status: 'failed',
              description: 'Your current plan does not support this action. Please upgrade or contact support.'
            })
        }
      })
      .catch(err => {
        return res.status(500)
          .json({status: 'failed', description: `Internal Server Error: ${err}`})
      })
  })
}

function doesRolePermitsThisAction (action) {
  if (!action) throw new Error('Action needs to be set')

  return compose().use(function meetsRequirements (req, res, next) {
    apiCaller.callApi(`permissions/query`, 'post', {userId: req.user._id}, req.headers.authorization)
      .then(plan => {
        plan = plan[0]
        if (!plan) {
          return res.status(500)
            .json({
              status: 'failed',
              description: 'Fatal Error. Permissions not set. Please contact support.'
            })
        }
        if (plan[action]) {
          next()
        } else {
          res.status(403)
            .json({
              status: 'failed',
              description: 'You do not have permissions for this action. Please contact admin.'
            })
        }
      })
      .catch(err => {
        return res.status(500)
          .json({status: 'failed', description: `Internal Server Error: ${err}`})
      })
  })
}

function validateApiKeys (req, res, next) {
  if (req.headers.hasOwnProperty('app_secret')) {
    apiCaller.callApi(`api_settings/query`, 'post', {
      app_id: req.headers['app_id'],
      app_secret: req.headers['app_secret'],
      enabled: true
    }, req.headers.authorization)
      .then(setting => {
        if (setting) {
          // todo this is for now buyer user id but it should be company id as thought
          apiCaller.callApi(`user/query`, 'post', {_id: setting.company_id, role: 'buyer'}, req.headers.authorization)
            .then(user => {
              req.user = {_id: user._id}
              next()
            })
            .catch(err => {
              return res.status(500)
                .json({status: 'failed', description: `Internal Server Error: ${err}`})
            })
        } else {
          return res.status(401).json({
            status: 'failed',
            description: 'Unauthorized. No such API credentials found.'
          })
        }
      })
      .catch(err => {
        return next(err)
      })
  } else {
    return res.status(401).json({
      status: 'failed',
      description: 'Unauthorized. Please provide both app_id and app_secret in headers.'
    })
  }
}

/**
 * Set token cookie directly for oAuth strategies
 */
function fbConnectDone (req, res) {
  let fbPayload = req.user
  let userid = req.cookies.userid
  if (!req.user) {
    return res.status(404).json({
      status: 'failed',
      description: 'Something went wrong, please try again.'
    })
  }

  apiCaller.callApi(`user/update`, 'put', {query: {_id: userid}, newPayload: {facebookInfo: fbPayload}, options: {}}, req.headers.authorization)
    .then(user => {
      if (!user) {
        return res.status(401)
          .json({status: 'failed', description: 'Unauthorized'})
      }
      req.user = user
      // set permissionsRevoked to false to indicate that permissions were regranted
      if (user.permissionsRevoked) {
        apiCaller.callApi('user/update', 'put', {query: {'facebookInfo.fbId': user.facebookInfo.fbId}, newPayload: {permissionsRevoked: false}, options: {multi: true}}, req.headers.authorization)
          .then(resp => {
            logger.serverLog(TAG, `response for permissionsRevoked ${util.inspect(resp)}`)
          })
          .catch(err => {
            return res.status(500)
              .json({status: 'failed', description: `Internal Server Error: ${err}`})
          })
      }
      fetchPages(`https://graph.facebook.com/v2.10/${
        fbPayload.fbId}/accounts?access_token=${
        fbPayload.fbToken}`, user, req)
      res.cookie('next', 'addPages', {expires: new Date(Date.now() + 60000)})
      res.redirect('/')
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: `Internal Server Error: ${err}`})
    })
}

// eslint-disable-next-line no-unused-vars
function isAuthorizedWebHookTrigger () {
  return compose().use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
      req.socket.remoteAddress || req.connection.socket.remoteAddress
    logger.serverLog(TAG, req.ip)
    logger.serverLog(TAG, ip)
    logger.serverLog(TAG, 'This is middleware')
    logger.serverLog(TAG, req.body)
    if (ip === '162.243.215.177') next()
    else res.send(403)
  })
}

function isItWebhookServer () {
  return compose().use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
      req.socket.remoteAddress || req.connection.socket.remoteAddress
    logger.serverLog(TAG, req.ip)
    logger.serverLog(TAG, ip)
    logger.serverLog(TAG, 'This is middleware')
    logger.serverLog(TAG, req.body)
    if (ip === '::ffff:' + config.webhook_ip) next()
    else res.send(403)
  })
}

// Auth for kibodash service
function isKiboDash (req, res, next) {
  logger.serverLog(TAG, `Request header from KiboDash ${JSON.stringify(req.headers)}`)
  next()
}

exports.isAuthenticated = isAuthenticated
exports.isAuthorizedSuperUser = isAuthorizedSuperUser
exports.hasRole = hasRole
exports.hasRequiredPlan = hasRequiredPlan
exports.doesPlanPermitsThisAction = doesPlanPermitsThisAction
exports.doesRolePermitsThisAction = doesRolePermitsThisAction
exports.fbConnectDone = fbConnectDone
exports.fetchPages = fetchPages
exports.isKiboDash = isKiboDash
exports.isItWebhookServer = isItWebhookServer
// This functionality will be exposed in later stages
// exports.isAuthorizedWebHookTrigger = isAuthorizedWebHookTrigger;

function fetchPages (url, user, req) {
  const options = {
    headers: {
      'X-Custom-Header': 'CloudKibo Web Application'
    },
    json: true

  }
  needle.get(url, options, (err, resp) => {
    if (err !== null) {
      logger.serverLog(TAG, 'error from graph api to get pages list data: ')
      logger.serverLog(TAG, JSON.stringify(err))
      return
    }
    // logger.serverLog(TAG, 'resp from graph api to get pages list data: ')
    // logger.serverLogF(TAG, JSON.stringify(resp.body))

    const data = resp.body.data
    const cursor = resp.body.paging
    if (data) {
      data.forEach((item) => {
        // logger.serverLog(TAG,
        //   `foreach ${JSON.stringify(item.name)}`)
        //  createMenuForPage(item)
        const options2 = {
          url: `https://graph.facebook.com/v2.10/${item.id}/?fields=fan_count,username&access_token=${item.access_token}`,
          qs: {access_token: item.access_token},
          method: 'GET'
        }
        needle.get(options2.url, options2, (error, fanCount) => {
          if (error !== null) {
            return logger.serverLog(TAG, `Error occurred ${error}`)
          } else {
            // logger.serverLog(TAG, `Data by fb for page likes ${JSON.stringify(
            //   fanCount.body.fan_count)}`)
            apiCaller.callApi(`companyUser/query`, 'post', {domain_email: user.domain_email}, req.headers.authorization)
              .then(companyUser => {
                if (!companyUser) {
                  return logger.serverLog(TAG, {
                    status: 'failed',
                    description: 'The user account does not belong to any company. Please contact support'
                  })
                }
                apiCaller.callApi(`page/query`, 'post', {pageId: item.id, userId: user._id, companyId: companyUser.companyId}, req.headers.authorization)
                  .then(pages => {
                    let page = pages[0]
                    if (!page) {
                      let payloadPage = {
                        pageId: item.id,
                        pageName: item.name,
                        accessToken: item.access_token,
                        userId: user._id,
                        companyId: companyUser.companyId,
                        likes: fanCount.body.fan_count,
                        pagePic: `https://graph.facebook.com/v2.10/${item.id}/picture`,
                        connected: false
                      }
                      if (fanCount.body.username) {
                        payloadPage = _.merge(payloadPage,
                          {pageUserName: fanCount.body.username})
                      }
                      // save model to MongoDB
                      apiCaller.callApi(`page`, 'post', payloadPage, req.headers.authorization)
                        .then(page => {
                          logger.serverLog(TAG,
                            `Page ${item.name} created with id ${page.pageId}`)
                        })
                        .catch(err => {
                          logger.serverLog(TAG,
                            `failed to create page ${JSON.stringify(err)}`)
                        })
                    } else {
                      let updatedPayload = {
                        likes: fanCount.body.fan_count,
                        pagePic: `https://graph.facebook.com/v2.10/${item.id}/picture`,
                        accessToken: item.access_token
                      }
                      if (fanCount.body.username) {
                        updatedPayload['pageUserName'] = fanCount.body.username
                      }

                      apiCaller.callApi(`page/update`, 'put', {query: {_id: page._id}, newPayload: updatedPayload}, req.headers.authorization)
                        .then(updated => {
                          logger.serverLog(TAG,
                            `page updated successfuly ${JSON.stringify(updated)}`)
                          // logger.serverLog(TAG, `Likes updated for ${page.pageName}`)
                        })
                        .catch(err => {
                          logger.serverLog(TAG,
                            `failed to update page ${JSON.stringify(err)}`)
                        })
                    }
                  })
              })
              .catch(err => {
                logger.serverLog(TAG,
                  `Internal Server Error ${JSON.stringify(err)}`)
              })
          }
        })
      })
    } else {
      logger.serverLog(TAG, 'Empty response from graph API to get pages list data')
    }
    if (cursor && cursor.next) {
      fetchPages(cursor.next, user, req)
    } else {
      logger.serverLog(TAG, 'Undefined Cursor from graph API')
    }
  })
}
