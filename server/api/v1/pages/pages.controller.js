const logicLayer = require('./pages.logiclayer')
const utility = require('../utility')
const needle = require('needle')
const logger = require('../../../components/logger')
const TAG = 'api/v1/pages/pages.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
let config = require('./../../../config/environment')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId }) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          return res.status(200).json({
            status: 'success',
            payload: pagesToSend
          })
        })
        .catch(error => {
          const message = error || 'Failed to fetch pages'
          logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.allPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { connected: true, companyId: companyuser.companyId }) // fetch connected pages
        .then(pages => {
          let subscribeAggregate = [
            { $match: { isSubscribed: true, completeInfo: true } },
            {
              $group: {
                _id: { pageId: '$pageId' },
                count: { $sum: 1 }
              }
            }
          ]
          utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
            .then(subscribesCount => {
              let unsubscribeAggregate = [
                { $match: { isSubscribed: false, completeInfo: true } },
                {
                  $group: {
                    _id: { pageId: '$pageId' },
                    count: { $sum: 1 }
                  }
                }
              ]
              utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate)
                .then(unsubscribesCount => {
                  let updatedPages = logicLayer.appendSubUnsub(pages)
                  updatedPages = logicLayer.appendSubscribersCount(updatedPages, subscribesCount)
                  updatedPages = logicLayer.appendUnsubscribesCount(updatedPages, unsubscribesCount)
                  res.status(200).json({
                    status: 'success',
                    payload: updatedPages
                  })
                })
                .catch(error => {
                  const message = error || 'Failed to fetch company user'
                  logger.serverLog(message, `${TAG}: exports.allPages`, {}, {user: req.user}, 'error')
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch unsubscribes ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              const message = error || 'Failed to fetch subscribes'
              logger.serverLog(message, `${TAG}: exports.allPages`, {}, {user: req.user}, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch subscribes ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch connected pages'
          logger.serverLog(message, `${TAG}: exports.allPages`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.allPages`, {}, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.connectedPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
        .then(count => {
          utility.callApi(`pages/aggregate`, 'post', criterias.fetchCriteria) // fetch connected pages
            .then(pages => {
              let subscribeAggregate = [
                { $match: { isSubscribed: true, completeInfo: true } },
                {
                  $group: {
                    _id: { pageId: '$pageId' },
                    count: { $sum: 1 }
                  }
                }
              ]
              utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
                .then(subscribesCount => {
                  let unsubscribeAggregate = [
                    { $match: { isSubscribed: false, completeInfo: true } },
                    {
                      $group: {
                        _id: { pageId: '$pageId' },
                        count: { $sum: 1 }
                      }
                    }
                  ]
                  utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate)
                    .then(unsubscribesCount => {
                      let updatedPages = logicLayer.appendSubUnsub(pages)
                      updatedPages = logicLayer.appendSubscribersCount(updatedPages, subscribesCount)
                      updatedPages = logicLayer.appendUnsubscribesCount(updatedPages, unsubscribesCount)
                      res.status(200).json({
                        status: 'success',
                        payload: { pages: updatedPages, count: count.length > 0 ? count[0].count : 0 }
                      })
                    })
                    .catch(error => {
                      const message = error || 'Failed to fetch company user'
                      logger.serverLog(message, `${TAG}: exports.connectedPages`, {}, {user: req.user}, 'error')
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch unsubscribes ${JSON.stringify(error)}`
                      })
                    })
                })
                .catch(error => {
                  const message = error || 'Failed to fetch subscribes'
                  logger.serverLog(message, `${TAG}: exports.connectedPages`, {}, {user: req.user}, 'error')
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch subscribes ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              const message = error || 'Failed to fetch connected pages'
              logger.serverLog(message, `${TAG}: exports.connectedPages`, {}, {user: req.user}, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch connected pages count'
          logger.serverLog(message, `${TAG}: exports.connectedPages`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch connected pages count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.connectedPages`, {}, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

const isPageManagePermissionError = (error) => {
  if (error.code === 190) {
    return true
  } else {
    return false
  }
}

exports.enable = function (req, res) {
  utility.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      utility.callApi(`featureUsage/planQuery`, 'post', { planId: companyUser.companyId.planId })
        .then(planUsage => {
          utility.callApi(`featureUsage/companyQuery`, 'post', { companyId: companyUser.companyId._id })
            .then(companyUsage => {
              // add paid plan check later
              // if (planUsage.facebook_pages !== -1 && companyUsage.facebook_pages >= planUsage.facebook_pages) {
              //   return res.status(500).json({
              //     status: 'failed',
              //     description: `Your pages limit has reached. Please upgrade your plan to premium in order to connect more pages.`
              //   })
              // }
              utility.callApi(`pages/${req.body._id}`, 'get', {}) // fetch page
                .then(page => {
                  needle('get', `https://graph.facebook.com/v6.0/me?access_token=${page.accessToken}`)
                    .then(response => {
                      if (response.body.error) {
                        if (!isPageManagePermissionError(response.body.error)) {
                          const message = response.body.error || 'Failed to fetch page information from Facebook'
                          logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                        }
                        return res.status(400).json({ status: 'failed', payload: response.body.error.message, type: 'invalid_permissions' })
                      } else {
                        utility.callApi(`pages/query`, 'post', { pageId: req.body.pageId, connected: true })
                          .then(pageConnected => {
                            if (pageConnected.length === 0) {
                              let query = {
                                connected: true,
                                isWelcomeMessageEnabled: true,
                                welcomeMessage: [
                                  {
                                    id: 0,
                                    componentType: 'text',
                                    text: 'Hi {{user_full_name}}! Thanks for getting in touch with us on Messenger. Please send us any questions you may have'
                                  }]
                              }
                              Object.assign(req.body, query)
                              utility.callApi('pages/query', 'post', { _id: req.body._id })
                                .then(pages => {
                                  let page = pages[0]

                                  query.welcomeMessage = page.welcomeMessage ? page.welcomeMessage : query.welcomeMessage
                                  // initiate reach estimation
                                  // needle('post', `https://graph.facebook.com/v6.0/me/broadcast_reach_estimations?access_token=${page.accessToken}`)
                                  //   .then(reachEstimation => {
                                  //     if (reachEstimation.body.error) {
                                  //       sendOpAlert(reachEstimation.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                                  //     }
                                  //     console.log('reachEstimation response', reachEstimation.body)
                                  //     if (reachEstimation.body.reach_estimation_id) {
                                  // query.reachEstimationId = reachEstimation.body.reach_estimation_id
                                  utility.callApi(`pages/${req.body._id}`, 'put', query) // connect page
                                    .then(connectPage => {
                                      utility.callApi(`featureUsage/updateCompany`, 'put', {
                                        query: { companyId: req.body.companyId },
                                        newPayload: { $inc: { facebook_pages: 1 } },
                                        options: {}
                                      })
                                        .then(updated => {
                                          // console.log('update company')
                                        })
                                        .catch(error => {
                                          const message = response.body.error || 'Failed to update company usage'
                                          logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                          sendErrorResponse(res, 500, `Failed to update company usage ${JSON.stringify(error)}`)
                                        })
                                      utility.callApi(`subscribers/update`, 'put', { query: { pageId: page._id }, newPayload: { isEnabledByPage: true }, options: {} }) // update subscribers
                                        .then(updatedSubscriber => {
                                          // eslint-disable-next-line no-unused-vars
                                          const options = {
                                            url: `https://graph.facebook.com/v6.0/${page.pageId}/subscribed_apps?access_token=${page.accessToken}`,
                                            qs: { access_token: page.accessToken },
                                            method: 'POST'
                                          }
                                          let bodyToSend = {
                                            subscribed_fields: [
                                              'feed', 'conversations', 'mention', 'messages', 'message_echoes', 'message_deliveries', 'messaging_optins', 'messaging_postbacks', 'message_reads', 'messaging_referrals', 'messaging_policy_enforcement']
                                          }
                                          needle.post(`https://graph.facebook.com/v3.2/me/subscribed_apps?access_token=${page.accessToken}`, bodyToSend, (error, response) => {
                                            if (error) {
                                              const message = error || 'Failed to see fb app all'
                                              logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                              sendErrorResponse(res, 500, JSON.stringify(error))
                                            }
                                            if (response.body.error) {
                                              const message = response.body.error || 'Failed to see fb app all'
                                              logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                            }
                                            if (response.body.success) {
                                              let updateConnectedFacebook = { query: { pageId: page.pageId }, newPayload: { connectedFacebook: true }, options: { multi: true } }
                                              utility.callApi(`pages/update`, 'post', updateConnectedFacebook) // connect page
                                                .then(updatedPage => {
                                                })
                                                .catch(error => {
                                                  const message = error || 'Failed to updatedPage'
                                                  logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                                })
                                            }
                                            var valueForMenu = {
                                              'get_started': {
                                                'payload': '<GET_STARTED_PAYLOAD>'
                                              },
                                              'greeting': [
                                                {
                                                  'locale': 'default',
                                                  'text': 'Hi {{user_full_name}}! Please tap on getting started to start the conversation.'
                                                }]
                                            }
                                            const requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${page.accessToken}`
                                            needle.request('post', requesturl, valueForMenu,
                                              { json: true }, function (err, resp) {
                                                if (err) {
                                                  const message = err || 'Internal Server Error'
                                                  logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                                }
                                                if (resp.body.error) {
                                                  const msg = resp.body.error.message || 'Page connect error'
                                                  const errorMessage = resp.body.error.message
                                                  if (errorMessage && errorMessage.includes('administrative permission')) {
                                                    logger.serverLog(msg, `${TAG}: exports.enable`, req.body, {page: page}, 'info')
                                                    sendSuccessResponse(res, 200, { adminError: 'Page connected successfully, but certain actions such as setting welcome message will not work due to your page role' })
                                                  } else {
                                                    logger.serverLog(msg, `${TAG}: exports.enable`, req.body, {page: page, error: req.body.error}, 'error')
                                                    _updateWhiteListDomain(req, page)
                                                    sendSuccessResponse(res, 200, 'Page connected successfully')
                                                  }
                                                  // sendOpAlert(resp.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                                                } else {
                                                  _updateWhiteListDomain(req, page)
                                                  sendSuccessResponse(res, 200, 'Page connected successfully')
                                                }
                                              })
                                            require('./../../../config/socketio').sendMessageToClient({
                                              room_id: req.body.companyId,
                                              body: {
                                                action: 'page_connect',
                                                payload: {
                                                  data: req.body,
                                                  company_id: req.body.companyId
                                                }
                                              }
                                            })
                                          })
                                        })
                                        .catch(error => {
                                          const message = error || 'Failed to update subscriber'
                                          logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                          sendErrorResponse(res, 500, `Failed to update subscriber ${JSON.stringify(error)}`)
                                        })
                                    })
                                    .catch(error => {
                                      const message = error || 'Failed to connect page'
                                      logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                      sendErrorResponse(res, 500, `Failed to connect page ${JSON.stringify(error)}`)
                                    })
                                  //   } else {
                                  //     logger.serverLog(TAG, `Failed to start reach estimation`, 'error')
                                  //   }
                                  // })
                                  // .catch(err => {
                                  //   logger.serverLog(TAG, `Error at find page ${err}`, 'error')
                                  // })
                                })
                                .catch(err => {
                                  const message = err || 'Error at find page'
                                  logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                                  sendErrorResponse(res, 500, err)
                                })
                            } else {
                              sendSuccessResponse(res, 200, { msg: `Page is already connected by ${pageConnected[0].userId.facebookInfo.name} (${pageConnected[0].userId.email}).` })
                            }
                          })
                      }
                    })
                    .catch(error => {
                      const message = error || 'Failed to check page token'
                      logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, `Failed to check page token ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  const message = error || 'Failed to fetch page'
                  logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Failed to fetch company usage'
              logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch plan usage'
          logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch plan usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.enable`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

const _updateWhiteListDomain = (req, page) => {
  utility.callApi(`pages/whitelistDomain`, 'post', { page_id: page.pageId, whitelistDomains: [`${config.domain}`] }, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
    })
    .catch(error => {
      const message = error || 'Failed to whitelist domain'
      logger.serverLog(message, `${TAG}: exports._updateWhiteListDomain`, {}, { page }, 'error')
    })
}

exports.disable = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { connected: false }) // disconnect page
    .then(disconnectPage => {
      utility.callApi(`subscribers/update`, 'put', { query: { pageId: req.body._id }, newPayload: { isEnabledByPage: false }, options: { multi: true } }) // update subscribers
        .then(updatedSubscriber => {
          utility.callApi(`featureUsage/updateCompany`, 'put', {
            query: { companyId: req.body.companyId },
            newPayload: { $inc: { facebook_pages: -1 } },
            options: {}
          })
            .then(updated => {
            })
            .catch(error => {
              const message = error || 'Failed to update company usage'
              logger.serverLog(message, `${TAG}: exports.disable`, req.body, { user: req.user }, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to update company usage ${JSON.stringify(error)}`
              })
            })
          const options = {
            url: `https://graph.facebook.com/v6.0/${req.body.pageId}/subscribed_apps?access_token=${req.body.accessToken}`,
            qs: { access_token: req.body.accessToken },
            method: 'DELETE'
          }
          needle.delete(options.url, options, (error, response) => {
            if (error) {
              const message = error || 'Failed to get subscribed app'
              logger.serverLog(message, `${TAG}: exports.disable`, req.body, { user: req.user }, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: JSON.stringify(error)
              })
            }
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.body.companyId,
              body: {
                action: 'page_disconnect',
                payload: {
                  page_id: req.body.pageId,
                  user_id: req.user._id,
                  user_name: req.user.name,
                  company_id: req.body.companyId
                }
              }
            })
            return res.status(200).json({
              status: 'success',
              payload: 'Page disconnected successfully!'
            })
          })
        })
        .catch(error => {
          const message = error || 'Failed to update subscribers'
          logger.serverLog(message, `${TAG}: exports.disable`, req.body, { user: req.user }, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to update subscribers ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.disable`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch page ${JSON.stringify(error)}`
      })
    })
}

exports.createWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { welcomeMessage: req.body.welcomeMessage })
    .then(updatedWelcomeMessage => {
      return res.status(200).json({
        status: 'success',
        payload: 'Welcome Message updated successfully!'
      })
    })
    .catch(error => {
      const message = error || 'Failed to update welcome message'
      logger.serverLog(message, `${TAG}: exports.createWelcomeMessage`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update welcome message ${JSON.stringify(error)}`
      })
    })
}

exports.enableDisableWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { isWelcomeMessageEnabled: req.body.isWelcomeMessageEnabled })
    .then(enabled => {
      return res.status(200).json({
        status: 'success',
        payload: 'Operation completed successfully!'
      })
    })
    .catch(error => {
      const message = error || 'Failed to update welcome message'
      logger.serverLog(message, `${TAG}: exports.enableDisableWelcomeMessage`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update welcome message ${JSON.stringify(error)}`
      })
    })
}
exports.whitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomains = req.body.whitelistDomains

  utility.callApi(`pages/whitelistDomain`, 'post', { page_id: pageId, whitelistDomains: whitelistDomains }, 'accounts', req.headers.authorization)
    .then(updatedwhitelistDomains => {
      return res.status(200).json({
        status: 'success',
        payload: updatedwhitelistDomains
      })
    })
    .catch(error => {
      const message = error || 'Failed to save whitelist domains'
      logger.serverLog(message, `${TAG}: exports.whitelistDomain`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to save whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.fetchWhitelistedDomains = function (req, res) {
  const pageId = req.params._id

  utility.callApi(`pages/whitelistDomain/${pageId}`, 'get', {}, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      return res.status(200).json({
        status: 'success',
        payload: whitelistDomains
      })
    })
    .catch(error => {
      const message = error || 'Failed to fetch whitelist domains'
      logger.serverLog(message, `${TAG}: exports.fetchWhitelistedDomains`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.deleteWhitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomain = req.body.whitelistDomain

  utility.callApi(`pages/deleteWhitelistDomain`, 'post', { page_id: pageId, whitelistDomain: whitelistDomain }, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      return res.status(200).json({
        status: 'success',
        payload: whitelistDomains
      })
    })
    .catch(error => {
      const message = error || 'Failed to delete whitelist domains'
      logger.serverLog(message, `${TAG}: exports.deleteWhitelistDomain`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to delete whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.isWhitelisted = function (req, res) {
  broadcastUtility.isWhiteListedDomain(req.body.domain, req.body.pageId, req.user)
    .then(result => {
      return res.status(200).json({
        status: 'success',
        payload: result.returnValue
      })
    })
    .catch(error => {
      const message = error || 'Failed to check whitelist domains'
      logger.serverLog(message, `${TAG}: exports.isWhitelisted`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to check whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.saveGreetingText = function (req, res) {
  const pageId = req.body.pageId
  const greetingText = req.body.greetingText
  utility.callApi(`pages/${pageId}/greetingText`, 'put', { greetingText: greetingText }, 'accounts', req.headers.authorization)
    .then(updatedGreetingText => {
      utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
        .then(companyuser => {
          utility.callApi(`pages/query`, 'post', { pageId: pageId, companyId: companyuser.companyId })
            .then(gotPage => {
              const pageToken = gotPage && gotPage[0].accessToken
              if (pageToken) {
                const requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${pageToken}`
                var valueForMenu = {
                  'greeting': [
                    {
                      'locale': 'default',
                      'text': greetingText
                    }]
                }
                needle.request('post', requesturl, valueForMenu, { json: true },
                  function (err, resp) {
                    if (!err) {
                      return res.status(200).json({
                        status: 'success',
                        payload: 'Operation completed successfully!'
                      })
                    }
                    if (err) {
                      const message = err || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.saveGreetingText`, req.body, {user: req.user}, 'error')
                    }
                  })
              } else {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to find page access token to update greeting text message`
                })
              }
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch companyUser'
          logger.serverLog(message, `${TAG}: exports.saveGreetingText`, req.body, { user: req.user }, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch companyUser ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to update greeting text message'
      logger.serverLog(message, `${TAG}: exports.saveGreetingText`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update greeting text message ${JSON.stringify(error)}`
      })
    })
}

exports.addPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId, isApproved: true }) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          return res.status(200).json({
            status: 'success',
            payload: pagesToSend
          })
        })
        .catch(error => {
          const message = error || 'Failed to update greeting text message'
          logger.serverLog(message, `${TAG}: exports.addPages`, req.body, { user: req.user }, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.addPages`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.otherPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId, connected: false, userId: req.user._id }) // fetch all pages of company
        .then(pages => {
          return res.status(200).json({
            status: 'success',
            payload: pages
          })
        })
        .catch(error => {
          const message = error || 'Failed to fetch pages'
          logger.serverLog(message, `${TAG}: exports.otherPages`, req.body, { user: req.user }, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.otherPages`, req.body, { user: req.user }, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

// eslint-disable-next-line no-unused-vars
function createTag (user, page, tag, req) {
  needle('post', `https://graph.facebook.com/v6.0/me/custom_labels?access_token=${page.accessToken}`, { 'name': tag })
    .then(label => {
      if (label.body.error) {
        if (label.body.error.code === 100) {
          utility.callApi('tags/query', 'post', { defaultTag: true, pageId: req.body._id, companyId: req.user.companyId, tag: tag })
            .then(defaultTag => {
              if (defaultTag.length === 0) {
                needle('get', `https://graph.facebook.com/v6.0/me/custom_labels?fields=name&access_token=${page.accessToken}`)
                  .then(Tags => {
                    let defaultTag = Tags.body.data.filter(data => data.name === tag)
                    let tagData = {
                      tag: tag,
                      userId: user._id,
                      companyId: user.companyId,
                      pageId: page._id,
                      labelFbId: defaultTag[0].id,
                      defaultTag: true
                    }
                    utility.callApi('tags', 'post', tagData)
                      .then(created => {
                      })
                      .catch(err => {
                        const message = err || 'Error at save tag'
                        logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
                      })
                  })

                  .catch(err => {
                    const message = err || 'Error at find default tags from facebook'
                    logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
                  })
              }
            })
            .catch(err => {
              const message = err || 'Error at find default tags'
              logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
            })
        } else {
          // sendOpAlert(label.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
          const message = label.body.error || 'Error at facebook error'
          logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
        }
      } else if (label.body.id) {
        let tagData = {
          tag: tag,
          userId: user._id,
          companyId: user.companyId,
          pageId: page._id,
          labelFbId: label.body.id,
          defaultTag: true
        }
        utility.callApi('tags', 'post', tagData)
          .then(created => {
          })
          .catch(err => {
            const message = err || 'Error at save tag'
            logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
          })
      } else {
        const message = label.body.error || 'else Error at create tag on Facebook'
        logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
      }
    })
    .catch(err => {
      const message = err || 'Error at create tag on Facebook'
      logger.serverLog(message, `${TAG}: exports.createTag`, {}, { user, page, tag }, 'error')
    })
}

exports.refreshPages = function (req, res) {
  utility.callApi(`pages/refreshPages`, 'post', {}, 'accounts', req.headers.authorization)// fetch all pages of company
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(error => {
      const message = error || 'Failed to refresh pages'
      logger.serverLog(message, `${TAG}: exports.refreshPages`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Failed to refresh pages ${JSON.stringify(error)}`)
    })
}
