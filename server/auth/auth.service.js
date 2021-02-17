/**
 * Created by sojharo on 24/07/2017.
 */
'use strict'

const config = require('../config/environment')
const compose = require('composable-middleware')
const apiCaller = require('../api/v1/utility')
const needle = require('needle')
const _ = require('lodash')
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
      if (req.headers.hasOwnProperty('is_kibo_product')) {
        isAuthorizedWebHookTrigger(req, res, next)
      } else {
        // allow access_token to be passed through query parameter as well
        if (req.query && req.query.hasOwnProperty('access_token')) {
          req.headers.authorization = `Bearer ${req.query.access_token}`
        }

        let headers = {
          'content-type': 'application/json',
          'Authorization': req.headers.authorization
        }
        if (req.headers.hasOwnProperty('consumer_id') && isAuthorizedKiboAPITrigger(req)) {
          headers = _.merge(headers, {
            consumer_id: req.headers.consumer_id
          })
        }
        let path = config.ACCOUNTS_URL.slice(0, config.ACCOUNTS_URL.length - 7)
        let options = {
          method: 'GET',
          uri: `${path}/auth/verify`,
          headers,
          json: true
        }

        requestPromise(options)
          .then(result => {
            // logger.serverLog(TAG, `response got ${result}`)
            if (result.status === 'success') {
              if (result.actingAsUser) {
                req.user = result.user
                req.actingAsUser = result.actingAsUser
              } else {
                req.user = result.user
              }
              next()
            } else {
              return res.status(401)
                .json({status: 'failed', description: 'Unauthorized'})
            }
          })
          .catch(err => {
            console.log('err1', err)
            if (err.statusCode && err.statusCode === 401) {
              return res.status(401)
                .json({status: 'Unauthorized', description: 'jwt expired'})
            } else {
              const message = err || 'error in authorising user'
              logger.serverLog(message, `${TAG}: exports.isAuthenticated`, {}, {user: req.user}, 'error')
              return res.status(500)
                .json({status: 'failed', description: `Internal Server Error: ${err}`})
            }
          })
      }
    })
    .use(function isSuperUserActingAsCustomer (req, res, next) {
      if (req.user.isSuperUser) {
        if (req.headers.hasOwnProperty('actingasuser')) {
          let actUserAs
          apiCaller.callApi(`user/query`, 'post', {domain_email: req.headers.actingasuser})
            .then(user => {
              req.user.domain_email = req.headers.actingasuser
              actUserAs = user
              return apiCaller.callApi('companyUser/query', 'post', {userId: actUserAs._id})
            })
            .then(companyUserInfo => {
              req.user.companyId = companyUserInfo.companyId
              return apiCaller.callApi('permissions/query', 'post', {userId: actUserAs._id})
            })
            .then(permissionsGot => {
              req.user.permissions = permissionsGot
              return apiCaller.callApi('companyprofile/query', 'post', {_id: req.user.companyId})
            })
            .then(companyProfileGot => {
              req.user.currentPlan = companyProfileGot.planId
              req.user.last4 = companyProfileGot.stripe.last4
              return apiCaller.callApi('permissions_plan/query', 'post', {plan_id: companyProfileGot.planId._id})
            })
            .then(permissionsPlan => {
              req.user.plan = permissionsPlan
              next()
            })
            .catch(err => {
              const message = err || 'error in authorising user acting as super user'
              logger.serverLog(message, `${TAG}: exports.isAuthenticated`, {}, {user: req.user}, 'error')
              return res.status(500)
                .json({status: 'failed', description: `Internal Server Error: ${err}`})
            })
        } else {
          next()
        }
      } else {
        next()
      }
    })
    .use(function sentryContextDefinition (req, res, next) {
      const Raven = require('raven')
      Raven.setContext({
        user: req.user
      })
      next()
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
    apiCaller.callApi(`permissions_plan/query`, 'post', {plan_id: req.user.plan.plan_id._id})
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
        const message = err || 'error in getting plan permission for action'
        logger.serverLog(message, `${TAG}: exports.doesPlanPermitsThisAction`, {}, {action, user: req.user}, 'error')
        return res.status(500)
          .json({status: 'failed', description: `Internal Server Error: ${err}`})
      })
  })
}

function isUserAllowedToPerformThisAction (action) {
  if (!action) throw new Error('Action needs to be set')
  return compose().use((req, res, next) => {
    apiCaller.callApi(`permissions/query`, 'post', {userId: req.user._id})
      .then(permissions => {
        if (permissions.length > 0) {
          const permission = permissions[0]
          if (permission[action]) {
            next()
          } else {
            return res.status(403).json({
              status: 'failed',
              description: 'You do not have the permission to perform this action. Please contact admin.'
            })
          }
        } else {
          return res.status(500).json({
            status: 'failed',
            description: 'Fatal Error. Permissions not set. Please contact support.'
          })
        }
      })
      .catch(err => {
        const message = err || 'error in getting permissions'
        logger.serverLog(message, `${TAG}: exports.isUserAllowedToPerformThisAction`, {}, {action, user: req.user}, 'error')
        return res.status(500).json({status: 'failed', description: `Internal Server Error: ${err}`})
      })
  })
}

function doesRolePermitsThisAction (action) {
  if (!action) throw new Error('Action needs to be set')

  return compose().use(function meetsRequirements (req, res, next) {
    apiCaller.callApi(`permissions/query`, 'post', {userId: req.user._id})
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
        const message = err || 'error in getting role permission for action'
        logger.serverLog(message, `${TAG}: exports.doesRolePermitsThisAction`, {}, {action, user: req.user}, 'error')
        return res.status(500)
          .json({status: 'failed', description: `Internal Server Error: ${err}`})
      })
  })
}

// eslint-disable-next-line no-unused-vars
function validateApiKeys (req, res, next) {
  if (req.headers.hasOwnProperty('app_secret')) {
    apiCaller.callApi(`api_settings/query`, 'post', {
      app_id: req.headers['app_id'],
      app_secret: req.headers['app_secret'],
      enabled: true
    })
      .then(setting => {
        if (setting) {
          // todo this is for now buyer user id but it should be company id as thought
          apiCaller.callApi(`user/query`, 'post', {_id: setting.company_id, role: 'buyer'})
            .then(user => {
              req.user = {_id: user._id}
              next()
            })
            .catch(err => {
              const message = err || 'error in validate api keys'
              logger.serverLog(message, `${TAG}: exports.validateApiKeys`, {}, {user: req.user}, 'error')
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
const _updateUserPlatform = (req, res, userid) => {
  apiCaller.callApi(`companyProfile/query`, 'post', {ownerId: userid}, 'accounts')
    .then(companyProfile => {
      apiCaller.callApi(`companyUser/queryAll`, 'post', {companyId: companyProfile._id}, 'accounts')
        .then(companyUsers => {
          let userIds = companyUsers.map(companyUser => {
            if (companyUser.userId) {
              return companyUser.userId._id
            }
          })
          apiCaller.callApi(`user/update`, 'post', {query: {_id: {$in: userIds}}, newPayload: { $set: {platform: 'messenger'} }, options: {multi: true}})
            .then(updatedProfile => {
            })
            .catch(err => {
              const message = err || 'Internal server error'
              logger.serverLog(message, `${TAG}: _updateUserPlatform`, req.body, {user: req.user}, 'error')
            })
        }).catch(err => {
          const message = err || 'Internal server error'
          logger.serverLog(message, `${TAG}: _updateUserPlatform`, req.body, {user: req.user}, 'error')
        })
    }).catch(err => {
      const message = err || 'Internal server error'
      logger.serverLog(message, `${TAG}: _updateUserPlatform`, req.body, {user: req.user}, 'error')
    })
}

function fbConnectError (req, res) {
  const description = req.query && req.query.description ? req.query.description : 'Something went wrong, please try again.'
  return res.render('error', {status: 'failed', description: description})
}

function fbConnectDone (req, res) {
  let fbPayload = req.user
  let userid = req.cookies.userid
  if (!req.user) {
    const description = encodeURIComponent('Something went wrong, please try again.')
    res.redirect(`/auth/facebook/error?description=${description}`)
  }
  // if (req.user.role !== 'buyer') {
  //   logger.serverLog(TAG, `User is an ${req.user.role}. Only buyers can connect their Facebook account`)
  //   res.render('error', {status: 'failed', description: `User is an ${req.user.role}. Only buyers can connect their Facebook account`})
  // }
  let token = `Bearer ${req.cookies.token}`
  apiCaller.callApi('user', 'get', {}, 'accounts', token)
    .then(user => {
      if (user.facebookInfo && user.facebookInfo.fbId.toString() !== fbPayload.fbId.toString()) {
        const description = encodeURIComponent('Different Facebook Account Detected. Please use the same account that you connected before.')
        res.redirect(`/auth/facebook/error?description=${description}`)
      } else {
        apiCaller.callApi(`user/update`, 'post', {query: {_id: userid}, newPayload: {facebookInfo: fbPayload, connectFacebook: true, showIntegrations: false, platform: 'messenger'}, options: {}}, 'accounts', token)
          .then(updated => {
            _updateUserPlatform(req, res, userid)
            apiCaller.callApi(`user/query`, 'post', {_id: userid}, 'accounts', token)
              .then(user => {
                if (!user) {
                  const description = encodeURIComponent('Something went wrong, please try again.')
                  res.redirect(`/auth/facebook/error?description=${description}`)
                }
                req.user = user[0]
                // set permissionsRevoked to false to indicate that permissions were regranted
                if (user.permissionsRevoked) {
                  apiCaller.callApi('user/update', 'post', {query: {'facebookInfo.fbId': user.facebookInfo.fbId}, newPayload: {permissionsRevoked: false}, options: {multi: true}})
                    .then(resp => {
                    })
                    .catch(err => {
                      const message = err || '500: Internal server error'
                      logger.serverLog(message, `${TAG}: exports.fbConnectDone`, {}, {user: req.user}, 'error')
                      const description = encodeURIComponent('Something went wrong, please try again.')
                      res.redirect(`/auth/facebook/error?description=${description}`)
                    })
                }
                fetchPages(`https://graph.facebook.com/v6.0/${
                  fbPayload.fbId}/accounts?access_token=${
                  fbPayload.fbToken}`, user[0], req, token)
                res.cookie('next', 'addPages', {expires: new Date(Date.now() + 60000)})
                res.redirect('/')
              })
              .catch(err => {
                const message = err || '500: Internal server error'
                logger.serverLog(message, `${TAG}: exports.fbConnectDone`, {}, {user: req.user}, 'error')
                const description = encodeURIComponent('Something went wrong, please try again.')
                res.redirect(`/auth/facebook/error?description=${description}`)
              })
          })
          .catch(err => {
            const message = err || '500: Internal server error'
            logger.serverLog(message, `${TAG}: exports.fbConnectDone`, {}, {user: req.user}, 'error')
            const description = encodeURIComponent('Something went wrong, please try again.')
            res.redirect(`/auth/facebook/error?description=${description}`)
          })
      }
    })
    .catch(err => {
      const message = err || '500: Internal server error'
      logger.serverLog(message, `${TAG}: exports.fbConnectDone`, {}, {user: req.user}, 'error')
      const description = encodeURIComponent('Something went wrong, please try again.')
      res.redirect(`/auth/facebook/error?description=${description}`)
    })
}

// eslint-disable-next-line no-unused-vars
function isAuthorizedWebHookTrigger (req, res, next) {
  /*const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
    req.socket.remoteAddress || req.connection.socket.remoteAddress
  // We need to change it to based on the requestee app
  if (config.allowedIps.indexOf(ip) > -1) next()
  else res.send(403)*/
}

function isItWebhookServer () {
  return compose().use((req, res, next) => {
    /*const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
      req.socket.remoteAddress || req.connection.socket.remoteAddress

    if (config.env === 'development') {
      next()
    } else {
      if (ip === '::ffff:' + config.webhook_ip) next()
      else res.send(403)
    }*/
    next()
  })
}

// Auth for kibodash service
function isKiboDash (req, res, next) {
  next()
}

exports.isAuthenticated = isAuthenticated
exports.isSuperUserActingAsCustomer = isSuperUserActingAsCustomer
exports.isAuthorizedSuperUser = isAuthorizedSuperUser
exports.hasRole = hasRole
exports.hasRequiredPlan = hasRequiredPlan
exports.doesPlanPermitsThisAction = doesPlanPermitsThisAction
exports.doesRolePermitsThisAction = doesRolePermitsThisAction
exports.isUserAllowedToPerformThisAction = isUserAllowedToPerformThisAction
exports.fbConnectDone = fbConnectDone
exports.fbConnectError = fbConnectError
exports.fetchPages = fetchPages
exports.isKiboDash = isKiboDash
exports.isItWebhookServer = isItWebhookServer
exports.validateApiKeys = validateApiKeys
// This functionality will be exposed in later stages
// exports.isAuthorizedWebHookTrigger = isAuthorizedWebHookTrigger;

function fetchPages (url, user, req, token) {
  const options = {
    headers: {
      'X-Custom-Header': 'CloudKibo Web Application'
    },
    json: true

  }
  needle.get(url, options, (err, resp) => {
    if (err !== null) {
      const message = err || 'error from graph api to get pages list data'
      logger.serverLog(message, `${TAG}: exports.fetchPages`, {}, {url, user}, 'error')
      return
    }
    // logger.serverLog(TAG, 'resp from graph api to get pages list data: ')
    // logger.serverLogF(TAG, JSON.stringify(resp.body))
    const data = resp.body.data
    const cursor = resp.body.paging
    apiCaller.callApi(`companyUser/query`, 'post', {domain_email: user.domain_email})
      .then(companyUser => {
        if (!companyUser) {
          return logger.serverLog(TAG, {
            status: 'failed',
            description: 'The user account does not belong to any company. Please contact support'
          })
        }
        // updateUnapprovedPages(data, user, companyUser)
        if (data) {
          data.forEach((item) => {
            // logger.serverLog(TAG,
            //   `foreach ${JSON.stringify(item.name)}`)
            //  createMenuForPage(item)
            const options2 = {
              url: `https://graph.facebook.com/v6.0/${item.id}/?fields=fan_count,username&access_token=${item.access_token}`,
              qs: {access_token: item.access_token},
              method: 'GET'
            }
            needle.get(options2.url, options2, (error, fanCount) => {
              if (error !== null) {
                const message = err || 'effor from graph api of facebook, fan_count and username'
                return logger.serverLog(message, `${TAG}: exports.fetchPages`, {}, {url, user}, 'error')
              } else {
                // logger.serverLog(TAG, `Data by fb for page likes ${JSON.stringify(
                //   fanCount.body.fan_count)}`)
                apiCaller.callApi(`pages/query`, 'post', {pageId: item.id, userId: user._id, companyId: companyUser.companyId})
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
                        pagePic: `https://graph.facebook.com/v6.0/${item.id}/picture`,
                        tasks: item.tasks
                      }
                      if (fanCount.body.username) {
                        payloadPage = _.merge(payloadPage,
                          {pageUserName: fanCount.body.username})
                      }
                      // save model to MongoDB
                      apiCaller.callApi(`pages`, 'post', payloadPage)
                        .then(page => {
                        })
                        .catch(err => {
                          const message = err || 'failed to create page'
                          logger.serverLog(message, `${TAG}: exports.fetchPages`, {}, {url, user}, 'error')
                        })
                    } else {
                      let updatedPayload = {
                        likes: fanCount.body.fan_count,
                        pagePic: `https://graph.facebook.com/v6.0/${item.id}/picture`,
                        accessToken: item.access_token,
                        isApproved: true,
                        pageName: item.name,
                        tasks: item.tasks
                      }
                      if (fanCount.body.username) {
                        updatedPayload['pageUserName'] = fanCount.body.username
                      }

                      apiCaller.callApi(`pages/${page._id}`, 'put', updatedPayload)
                        .then(updated => {
                          // logger.serverLog(TAG, `Likes updated for ${page.pageName}`)
                        })
                        .catch(err => {
                          const message = err || 'failed to update page'
                          logger.serverLog(message, `${TAG}: exports.fetchPages`, {}, {url, user}, 'error')
                        })
                    }
                  })
              }
            })
          })
        } else {
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.fetchPages`, {}, {url, user}, 'error')
      })
    if (cursor && cursor.next) {
      fetchPages(cursor.next, user, req)
    } else {
    }
  })
}

// eslint-disable-next-line no-unused-vars
function updateUnapprovedPages (facebookPages, user, companyUser) {
  if (facebookPages.length > 0) {
    let fbPages = facebookPages.map(item => item.id)
    apiCaller.callApi(`pages/query`, 'post', {userId: user._id, companyId: companyUser.companyId})
      .then(localPages => {
        for (let i = 0; i < localPages.length; i++) {
          if (!fbPages.includes(localPages[i].pageId)) {
            apiCaller.callApi(`pages/${localPages[i]._id}`, 'put', {isApproved: false, connected: false})
              .then(updated => {
              })
          }
        }
      })
  }
}

/**
 * Checks if a super user is acting as customer
 */
function isSuperUserActingAsCustomer (modeOfAction) {
  return compose()
    .use((req, res, next) => {
      if (req.actingAsUser) {
        if (modeOfAction === 'write') {
          return res.status(403)
            .json({status: 'failed', description: `You are not allowed to perform this action`})
        } else {
          req.superUser = req.user
          req.user = req.actingAsUser
          next()
        }
      } else {
        next()
      }
    })
}

// eslint-disable-next-line no-unused-vars
function isAuthorizedKiboAPITrigger (req) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
    req.socket.remoteAddress || req.connection.socket.remoteAddress
  // We need to change it to based on the requestee app
  if (config.kiboAPIIP.indexOf(ip) > -1) return true
  else return false
}

function isAuthorizedSuperUser () {
  return compose()
    .use(isAuthenticated())
    .use(function meetsRequirements (req, res, next) {
      if (req.user.isSuperUser) {
        next()
      } else {
        res.send(403)
      }
    })
}

exports.isAuthorizedSuperUser = isAuthorizedSuperUser
