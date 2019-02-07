const logicLayer = require('./pages.logiclayer')
const utility = require('../utility')
const needle = require('needle')
const logger = require('../../../components/logger')
const TAG = 'api/v2/pages/pages.controller.js'
let config = require('./../../../config/environment')

// const util = require('util')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch all pages of company
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {connected: true, companyId: companyuser.companyId}, req.headers.authorization) // fetch connected pages
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
          utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate, req.headers.authorization)
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
              utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate, req.headers.authorization)
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch connected pages count
        .then(count => {
          utility.callApi(`pages/aggregate`, 'post', criterias.fetchCriteria, req.headers.authorization) // fetch connected pages
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
              utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate, req.headers.authorization)
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
                  utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate, req.headers.authorization)
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
  utility.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email, populate: 'companyId'}, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId}, req.headers.authorization)
        .then(planUsage => {
          utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId._id}, req.headers.authorization)
            .then(companyUsage => {
              // add paid plan check later
              // if (planUsage.facebook_pages !== -1 && companyUsage.facebook_pages >= planUsage.facebook_pages) {
              //   return res.status(500).json({
              //     status: 'failed',
              //     description: `Your pages limit has reached. Please upgrade your plan to premium in order to connect more pages.`
              //   })
              // }
              utility.callApi(`pages/${req.body._id}`, 'get', {}, req.headers.authorization) // fetch page
                .then(page => {
                  needle.get(
                    `https://graph.facebook.com/v2.10/${page.pageId}?fields=is_published&access_token=${page.userId.facebookInfo.fbToken}`,
                    (err, resp) => {
                      if (err) {
                        logger.serverLog(TAG,
                          `Graph api error at getting page publish status ${JSON.stringify(err)}`)
                      }
                      if (resp.body.is_published === false) {
                        return res.status(404).json({
                          status: 'failed',
                          payload: 'Page is not published.'
                        })
                      } else {
                        utility.callApi(`pages/${page._id}/connect`, 'get', {}, req.headers.authorization) // fetch connected page
                          .then(pageConnected => {
                            if (pageConnected !== {}) {
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
                              utility.callApi(`pages/${req.body._id}`, 'put', query, req.headers.authorization) // connect page
                                .then(connectPage => {
                                  utility.callApi(`pages/whitelistDomain`, 'post', {page_id: page.pageId, whitelistDomains: [`${config.domain}`]}, req.headers.authorization)
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
                                  }, req.headers.authorization)
                                    .then(updated => {
                                    })
                                    .catch(error => {
                                      return res.status(500).json({
                                        status: 'failed',
                                        payload: `Failed to update company usage ${JSON.stringify(error)}`
                                      })
                                    })
                                  utility.callApi(`subscribers/update`, 'put', {query: {pageId: page._id}, newPayload: {isEnabledByPage: true}, options: {}}, req.headers.authorization) // update subscribers
                                    .then(updatedSubscriber => {
                                      const options = {
                                        url: `https://graph.facebook.com/v2.6/${page.pageId}/subscribed_apps?access_token=${page.accessToken}`,
                                        qs: {access_token: page.accessToken},
                                        method: 'POST'
                                      }
                                      needle.post(options.url, options, (error, response) => {
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
                                            console.log('response from gettingStarted', resp.body)
                                          })
                                        require('./../../../config/socketio').sendMessageToClient({
                                          room_id: req.body.companyId,
                                          body: {
                                            action: 'page_connect',
                                            payload: {
                                              page_id: page.pageId,
                                              user_id: req.user._id,
                                              user_name: req.user.name,
                                              company_id: req.body.companyId
                                            }
                                          }
                                        })
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
                              res.status(400).json({
                                status: 'failed',
                                payload: `Page is already connected by ${pageConnected.userId.facebookInfo.name}. In order to manage this page please ask ${pageConnected.userId.facebookInfo.name} to create a team account and invite you.`
                              })
                            }
                          })
                          .catch(error => {
                            return res.status(500).json({
                              status: 'failed',
                              payload: `Failed to fetch connected page ${JSON.stringify(error)}`
                            })
                          })
                      }
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
  utility.callApi(`pages/${req.body._id}`, 'put', {connected: false}, req.headers.authorization) // disconnect page
    .then(disconnectPage => {
      logger.serverLog(TAG, 'updated page successfully')
      utility.callApi(`subscribers/update`, 'put', {query: {pageId: req.body._id}, newPayload: {isEnabledByPage: false}, options: {multi: true}}, req.headers.authorization) // update subscribers
        .then(updatedSubscriber => {
          utility.callApi(`featureUsage/updateCompany`, 'put', {
            query: {companyId: req.body.companyId},
            newPayload: { $inc: { facebook_pages: -1 } },
            options: {}
          }, req.headers.authorization)
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
  utility.callApi(`pages/${req.body._id}`, 'put', {welcomeMessage: req.body.welcomeMessage}, req.headers.authorization)
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
  utility.callApi(`pages/${req.body._id}`, 'put', {isWelcomeMessageEnabled: req.body.isWelcomeMessageEnabled}, req.headers.authorization)
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
  const pageId = req.body.pageId
  const whitelistDomains = req.body.whitelistDomains

  utility.callApi(`pages/whitelistDomain`, 'post', {whitelistDomains: whitelistDomains, page_id: pageId}, req.headers.authorization)
    .then(updatedPages => {
      return res.status(200).json({
        status: 'success',
        payload: updatedPages
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to update whitelist domains ${JSON.stringify(error)}`
      })
    })
}
exports.saveGreetingText = function (req, res) {
  const pageId = req.body.pageId
  const greetingText = req.body.greetingText
  utility.callApi(`pages/${pageId}/greetingText`, 'put', {greetingText: greetingText}, req.headers.authorization)
    .then(updatedGreetingText => {
      utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
        .then(companyuser => {
          utility.callApi(`pages/query`, 'post', {pageId: pageId, companyId: companyuser.companyId}, req.headers.authorization)
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch all pages of company
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyuser.companyId, connected: false, userId: req.user._id}, req.headers.authorization) // fetch all pages of company
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
