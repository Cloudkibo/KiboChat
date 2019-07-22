const logicLayer = require('./pages.logiclayer')
const utility = require('../utility')
const needle = require('needle')
const logger = require('../../../components/logger')
const TAG = 'api/v2/pages/pages.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
let config = require('./../../../config/environment')

const util = require('util')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId}) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          return res.status(200).json({
            status: 'success',
            payload: pagesToSend
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.allPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {connected: true, companyId: companyuser.companyId}) // fetch connected pages
        .then(pages => {
          let subscribeAggregate = [
            {$match: {isSubscribed: true}},
            {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }
          ]
          utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
            .then(subscribesCount => {
              let unsubscribeAggregate = [
                {$match: {isSubscribed: false}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
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
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch unsubscribes ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch subscribes ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.connectedPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
        .then(count => {
          utility.callApi(`pages/aggregate`, 'post', criterias.fetchCriteria) // fetch connected pages
            .then(pages => {
              let subscribeAggregate = [
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }
              ]
              utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
                .then(subscribesCount => {
                  let unsubscribeAggregate = [
                    {$match: {isSubscribed: false}},
                    {
                      $group: {
                        _id: {pageId: '$pageId'},
                        count: {$sum: 1}
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
                        payload: {pages: updatedPages, count: count.length > 0 ? count[0].count : 0}
                      })
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch unsubscribes ${JSON.stringify(error)}`
                      })
                    })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch subscribes ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch connected pages count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.enable = function (req, res) {
  utility.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email, populate: 'companyId'})
    .then(companyUser => {
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId})
        .then(planUsage => {
          utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId._id})
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
                  needle('get', `https://graph.facebook.com/v2.6/me?access_token=${page.accessToken}`)
                    .then(response => {
                      if (response.body.error) {
                        return res.status(400).json({status: 'failed', payload: response.body.error.message, type: 'invalid_permissions'})
                      } else {
                        utility.callApi(`pages/query`, 'post', {pageId: req.body.pageId, connected: true})
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
                              utility.callApi('pages/query', 'post', {_id: req.body._id})
                                .then(pages => {
                                  let page = pages[0]
                                  // create default tags
                                  utility.callApi('tags/query', 'post', {defaultTag: true, pageId: req.params._id, companyId: req.user.companyId})
                                    .then(defaultTags => {
                                      defaultTags = defaultTags.map((t) => t.tag)
                                      if (!defaultTags.includes(`_${page.pageId}_1`)) {
                                        createTag(req.user, page, `_${page.pageId}_1`, req)
                                      }
                                      if (!defaultTags.includes('male')) {
                                        createTag(req.user, page, 'male', req)
                                      }
                                      if (!defaultTags.includes('female')) {
                                        createTag(req.user, page, 'female', req)
                                      }
                                      if (!defaultTags.includes('other')) {
                                        createTag(req.user, page, 'other', req)
                                      }
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, `Error at find default tags ${err}`)
                                    })
                                  // initiate reach estimation
                                  needle('post', `https://graph.facebook.com/v2.11/me/broadcast_reach_estimations?access_token=${page.accessToken}`)
                                    .then(reachEstimation => {
                                      if (reachEstimation.body.reach_estimation_id) {
                                        query.reachEstimationId = reachEstimation.body.reach_estimation_id
                                        utility.callApi(`pages/${req.body._id}`, 'put', query) // connect page
                                          .then(connectPage => {
                                            utility.callApi(`pages/whitelistDomain`, 'post', {page_id: page.pageId, whitelistDomains: [`${config.domain}`]}, 'accounts', req.headers.authorization)
                                              .then(whitelistDomains => {
                                              })
                                              .catch(error => {
                                                logger.serverLog(TAG,
                                                  `Failed to whitelist domain ${JSON.stringify(error)}`)
                                              })
                                            utility.callApi(`featureUsage/updateCompany`, 'put', {
                                              query: {companyId: req.body.companyId},
                                              newPayload: { $inc: { facebook_pages: 1 } },
                                              options: {}
                                            })
                                              .then(updated => {
                                              })
                                              .catch(error => {
                                                return res.status(500).json({
                                                  status: 'failed',
                                                  payload: `Failed to update company usage ${JSON.stringify(error)}`
                                                })
                                              })
                                            utility.callApi(`subscribers/update`, 'put', {query: {pageId: page._id}, newPayload: {isEnabledByPage: true}, options: {}}) // update subscribers
                                              .then(updatedSubscriber => {
                                                const options = {
                                                  url: `https://graph.facebook.com/v3.2/${page.pageId}/subscribed_apps?access_token=${page.accessToken}`,
                                                  qs: {access_token: page.accessToken},
                                                  method: 'POST'
                                                }
                                                let bodyToSend = {
                                                  subscribed_fields: [
                                                    'feed', 'conversations', 'mention', 'messages', 'message_echoes', 'message_deliveries', 'messaging_optins', 'messaging_postbacks', 'message_reads', 'messaging_referrals', 'messaging_policy_enforcement']
                                                }
                                                needle.post(`https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=${page.accessToken}`, bodyToSend, (error, response) => {
                                                  if (error) {
                                                    return res.status(500).json({
                                                      status: 'failed',
                                                      payload: JSON.stringify(error)
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
                                                  const requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`
                                                  needle.request('post', requesturl, valueForMenu,
                                                    {json: true}, function (err, resp) {
                                                      if (err) {
                                                        logger.serverLog(TAG,
                                                          `Internal Server Error ${JSON.stringify(
                                                            err)}`)
                                                      }
                                                    })
                                                  // require('./../../../config/socketio').sendMessageToClient({
                                                  //   room_id: req.body.companyId,
                                                  //   body: {
                                                  //     action: 'page_connect',
                                                  //     payload: {
                                                  //       page_id: page.pageId,
                                                  //       user_id: req.user._id,
                                                  //       user_name: req.user.name,
                                                  //       company_id: req.body.companyId
                                                  //     }
                                                  //   }
                                                  // })
                                                  return res.status(200).json({
                                                    status: 'success',
                                                    payload: 'Page connected successfully!'
                                                  })
                                                })
                                              })
                                              .catch(error => {
                                                return res.status(500).json({
                                                  status: 'failed',
                                                  payload: `Failed to update subscriber ${JSON.stringify(error)}`
                                                })
                                              })
                                          })
                                          .catch(error => {
                                            return res.status(500).json({
                                              status: 'failed',
                                              payload: `Failed to connect page ${JSON.stringify(error)}`
                                            })
                                          })
                                      } else {
                                        logger.serverLog(TAG, `Failed to start reach estimation`)
                                      }
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, `Error at find page ${err}`)
                                    })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Error at find page ${err}`)
                                  res.status(500).json({status: 'failed', payload: err})
                                })
                            } else {
                              res.status(200).json({
                                status: 'success',
                                payload: {msg: `Page is already connected by ${pageConnected[0].userId.facebookInfo.name} (${pageConnected[0].userId.email}).`}
                              })
                            }
                          })
                      }
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to check page token ${JSON.stringify(error)}`
                      })
                    })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch page ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch company usage ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch plan usage ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.disable = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', {connected: false}) // disconnect page
    .then(disconnectPage => {
      logger.serverLog(TAG, 'updated page successfully')
      utility.callApi(`subscribers/update`, 'put', {query: {pageId: req.body._id}, newPayload: {isEnabledByPage: false}, options: {multi: true}}) // update subscribers
        .then(updatedSubscriber => {
          utility.callApi(`featureUsage/updateCompany`, 'put', {
            query: {companyId: req.body.companyId},
            newPayload: { $inc: { facebook_pages: -1 } },
            options: {}
          })
            .then(updated => {
              logger.serverLog(TAG, 'company updated successfully')
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to update company usage ${JSON.stringify(error)}`
              })
            })
          const options = {
            url: `https://graph.facebook.com/v2.6/${req.body.pageId}/subscribed_apps?access_token=${req.body.accessToken}`,
            qs: {access_token: req.body.accessToken},
            method: 'DELETE'
          }
          needle.delete(options.url, options, (error, response) => {
            if (error) {
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
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to update subscribers ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch page ${JSON.stringify(error)}`
      })
    })
}

exports.createWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', {welcomeMessage: req.body.welcomeMessage})
    .then(updatedWelcomeMessage => {
      return res.status(200).json({
        status: 'success',
        payload: 'Welcome Message updated successfully!'
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update welcome message ${JSON.stringify(error)}`
      })
    })
}

exports.enableDisableWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', {isWelcomeMessageEnabled: req.body.isWelcomeMessageEnabled})
    .then(enabled => {
      return res.status(200).json({
        status: 'success',
        payload: 'Operation completed successfully!'
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update welcome message ${JSON.stringify(error)}`
      })
    })
}
exports.whitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomains = req.body.whitelistDomains

  utility.callApi(`pages/whitelistDomain`, 'post', {page_id: pageId, whitelistDomains: whitelistDomains}, 'accounts', req.headers.authorization)
    .then(updatedwhitelistDomains => {
      return res.status(200).json({
        status: 'success',
        payload: updatedwhitelistDomains
      })
    })
    .catch(error => {
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
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.deleteWhitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomain = req.body.whitelistDomain

  utility.callApi(`pages/deleteWhitelistDomain`, 'post', {page_id: pageId, whitelistDomain: whitelistDomain}, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      return res.status(200).json({
        status: 'success',
        payload: whitelistDomains
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to delete whitelist domains ${JSON.stringify(error)}`
      })
    })
}

exports.isWhitelisted = function (req, res) {
  console.log('req body brdut', req.user)
  broadcastUtility.isWhiteListedDomain(req.body.domain, req.body.pageId, req.user)
    .then(result => {
      return res.status(200).json({
        status: 'success',
        payload: result.returnValue
      })
    })
}

exports.saveGreetingText = function (req, res) {
  const pageId = req.body.pageId
  const greetingText = req.body.greetingText
  utility.callApi(`pages/${pageId}/greetingText`, 'put', {greetingText: greetingText}, 'accounts', req.headers.authorization)
    .then(updatedGreetingText => {
      utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
        .then(companyuser => {
          utility.callApi(`pages/query`, 'post', {pageId: pageId, companyId: companyuser.companyId})
            .then(gotPage => {
              const pageToken = gotPage && gotPage[0].accessToken
              if (pageToken) {
                const requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${pageToken}`
                var valueForMenu = {
                  'greeting': [
                    {
                      'locale': 'default',
                      'text': greetingText
                    }]
                }
                needle.request('post', requesturl, valueForMenu, {json: true},
                  function (err, resp) {
                    if (!err) {
                      return res.status(200).json({
                        status: 'success',
                        payload: 'Operation completed successfully!'
                      })
                    }
                    if (err) {
                      logger.serverLog(TAG,
                        `Internal Server Error ${JSON.stringify(err)}`)
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
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch companyUser ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update greeting text message ${JSON.stringify(error)}`
      })
    })
}

exports.addPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId}) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          return res.status(200).json({
            status: 'success',
            payload: pagesToSend
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.otherPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId, connected: false, userId: req.user._id}) // fetch all pages of company
        .then(pages => {
          return res.status(200).json({
            status: 'success',
            payload: pages
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

function createTag (user, page, tag, req) {
  needle('post', `https://graph.facebook.com/v2.11/me/custom_labels?access_token=${page.accessToken}`, {'name': tag})
    .then(label => {
      if (label.body.id) {
        let tagData = {
          tag: tag,
          userId: user._id,
          companyId: user.companyId,
          pageId: page._id,
          labelFbId: label.body.id,
          defaultTag: true
        }
        utility.callApi('tags', 'post', tagData, req.headers.authorization)
          .then(created => {
            logger.serverLog(TAG, `default tag created successfully!`)
          })
          .catch(err => {
            logger.serverLog(TAG, `Error at save tag ${err}`)
          })
      } else {
        logger.serverLog(TAG, `Error at create tag on Facebook ${label.body.error}`)
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Error at create tag on Facebook ${err}`)
    })
}
