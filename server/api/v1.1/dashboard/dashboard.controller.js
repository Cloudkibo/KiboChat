const logger = require('../../../components/logger')
const TAG = 'api/pages/dashboard.controller.js'
const sortBy = require('sort-array')
// const needle = require('needle')
// const util = require('util')
const {callApi} = require('../utility')
let _ = require('lodash')
const LogicLayer = require('./logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi('pages/aggregate', 'post', [])
    .then(pages => {
      const data = {}
      let c = pages.length
      data.pagesCount = c
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      if (err) {
        const message = err || 'Failed to get pages aggregate'
        logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', JSON.stringify(err))
      }
    })
}

exports.sentVsSeen = function (req, res) {
  let pageId = req.params.pageId
  let datacounts = {}

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi('pages/query', 'post', {pageId: pageId})
        .then(pages => {
          const pagesArray = pages.map(page => page._id).map(String)
          callApi('sessions/query', 'post', {purpose: 'findAll', match: {company_id: companyUser.companyId.toString(), page_id: {$in: pagesArray}}}, 'kibochat')
            .then(sessions => {
              const resolvedSessions = sessions.filter(session => session.status === 'resolved')
              datacounts.sessions = {
                count: sessions.length,
                resolved: resolvedSessions.length
              }
              callApi('smart_replies/query', 'post', {purpose: 'findAll', match: {companyId: companyUser.companyId.toString(), pageId: {$in: pagesArray}}}, 'kibochat')
                .then(bots => {
                  const hitCountArray = bots.map(bot => bot.hitCount)
                  const missCountArray = bots.map(bot => bot.missCount)
                  const responded = hitCountArray.reduce((a, b) => a + b, 0)
                  const notResponded = missCountArray.reduce((a, b) => a + b, 0)
                  datacounts.bots = {
                    count: responded + notResponded,
                    responded
                  }
                  sendSuccessResponse(res, 200, datacounts)
                })
                .catch(err => {
                  const message = err || 'Failed to get bots'
                  logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
                  sendErrorResponse(res, 500, '', `Failed to get bots ${err}}`)
                })
            })
            .catch(err => {
              const message = err || 'Failed to get sessions'
              logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
              sendErrorResponse(res, 500, '', `Failed to get sessions ${err}}`)
            })
        })
        .catch(err => {
          const message = err || 'Failed to get pages'
          logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, '', `Failed to get pages ${err}}`)
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Failed to get pages'
        logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, '', `Failed to get pages ${err}}`)
      }
    })
}

exports.sentVsSeenNew = function (req, res) {
  let datacounts = {}
  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      if (req.body.pageId !== 'all') {
        callApi('pages/query', 'post', {pageId: req.body.pageId})
          .then(pages => {
            const pagesArray = pages.map(page => page._id)
            let matchAggregate = { companyId: companyUser.companyId,
              completeInfo: true,
              'pageId': {$in: pagesArray},
              'datetime': req.body.days === 'all' ? { $exists: true } : {
                $gte: new Date(
                  (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
                $lt: new Date(
                  (new Date().getTime()))
              }
            }
            let matchAggregateForBots = { companyId: companyUser.companyId.toString(),
              'pageId': {$in: pagesArray},
              'datetime': req.body.days === 'all' ? { $exists: true } : {
                $gte: new Date(
                  (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
                $lt: new Date(
                  (new Date().getTime()))
              }
            }
            callApi('subscribers/query', 'post', matchAggregate)
              .then(sessions => {
                const resolvedSessions = sessions.filter(session => session.status === 'resolved')
                datacounts.sessions = {
                  count: sessions.length,
                  resolved: resolvedSessions.length
                }
                callApi('smart_replies/query', 'post', {purpose: 'findAll', match: matchAggregateForBots}, 'kibochat')
                  .then(bots => {
                    const hitCountArray = bots.map(bot => bot.hitCount)
                    const missCountArray = bots.map(bot => bot.missCount)
                    const responded = hitCountArray.reduce((a, b) => a + b, 0)
                    const notResponded = missCountArray.reduce((a, b) => a + b, 0)
                    datacounts.bots = {
                      count: responded + notResponded,
                      responded
                    }
                    graphDataNew(req.body, companyUser, pagesArray)
                      .then(result => {
                        let payload = {
                          datacounts,
                          graphDatas: result
                        }
                        sendSuccessResponse(res, 200, payload)
                      })
                      .catch(err => {
                        const message = err || 'Error in getting graphdata'
                        logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                        sendErrorResponse(res, 500, `Error in getting graphdata ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Failed to get bots'
                    logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                    sendErrorResponse(res, 500, '', `Failed to get bots ${err}}`)
                  })
              })
              .catch(err => {
                const message = err || 'Failed to get sessions'
                logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                sendErrorResponse(res, 500, '', `Failed to get sessions ${err}}`)
              })
          })
          .catch(err => {
            const message = err || 'Failed to get pages'
            logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
            sendErrorResponse(res, 500, '', `Failed to get pages ${err}}`)
          })
      } else {
        callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
          .then(pages => {
            const pagesArray = pages.map(page => page._id)
            let matchAggregate = { companyId: companyUser.companyId,
              completeInfo: true,
              'pageId': {$in: pagesArray},
              'datetime': req.body.days === 'all' ? { $exists: true } : {
                $gte: new Date(
                  (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
                $lt: new Date(
                  (new Date().getTime()))
              }
            }
            let matchAggregateForBots = { companyId: companyUser.companyId.toString(),
              'pageId': {$in: pagesArray},
              'datetime': req.body.days === 'all' ? { $exists: true } : {
                $gte: new Date(
                  (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
                $lt: new Date(
                  (new Date().getTime()))
              }
            }
            callApi('subscribers/query', 'post', matchAggregate)
              .then(sessions => {
                const resolvedSessions = sessions.filter(session => session.status === 'resolved')
                datacounts.sessions = {
                  count: sessions.length,
                  resolved: resolvedSessions.length
                }
                callApi('smart_replies/query', 'post', {purpose: 'findAll', match: matchAggregateForBots}, 'kibochat')
                  .then(bots => {
                    const hitCountArray = bots.map(bot => bot.hitCount)
                    const missCountArray = bots.map(bot => bot.missCount)
                    const responded = hitCountArray.reduce((a, b) => a + b, 0)
                    const notResponded = missCountArray.reduce((a, b) => a + b, 0)
                    datacounts.bots = {
                      count: responded + notResponded,
                      responded
                    }
                    graphDataNew(req.body, companyUser, pagesArray)
                      .then(result => {
                        let payload = {
                          datacounts,
                          graphDatas: result
                        }
                        sendSuccessResponse(res, 200, payload)
                      })
                      .catch(err => {
                        const message = err || 'Error in getting graphdata'
                        logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                        sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Failed to get bots'
                    logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                    sendErrorResponse(res, 500, '', `Failed to get bots ${err}}`)
                  })
              })
              .catch(err => {
                const message = err || 'Failed to get sessions'
                logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
                sendErrorResponse(res, 500, '', `Failed to get sessions ${err}}`)
              })
          })
          .catch(err => {
            const message = err || 'Failed to get connected pages'
            logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
            sendErrorResponse(res, 500, '', `Failed to get connected pages ${err}}`)
          })
      }
    })
    .catch(err => {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sentVsSeenNew`, {}, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

exports.sentVsSeen = function (req, res) {
  let pageId = req.params.pageId
  let datacounts = {}

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi('pages/query', 'post', {pageId: pageId})
        .then(pages => {
          const pagesArray = pages.map(page => page._id).map(String)
          callApi('sessions/query', 'post', {purpose: 'findAll', match: {company_id: companyUser.companyId.toString(), page_id: {$in: pagesArray}}}, 'kibochat')
            .then(sessions => {
              const resolvedSessions = sessions.filter(session => session.status === 'resolved')
              datacounts.sessions = {
                count: sessions.length,
                resolved: resolvedSessions.length
              }
              callApi('smart_replies/query', 'post', {purpose: 'findAll', match: {companyId: companyUser.companyId.toString(), pageId: {$in: pagesArray}}}, 'kibochat')
                .then(bots => {
                  const hitCountArray = bots.map(bot => bot.hitCount)
                  const missCountArray = bots.map(bot => bot.missCount)
                  const responded = hitCountArray.reduce((a, b) => a + b, 0)
                  const notResponded = missCountArray.reduce((a, b) => a + b, 0)
                  datacounts.bots = {
                    count: responded + notResponded,
                    responded
                  }
                  sendSuccessResponse(res, 200, datacounts)
                })
                .catch(err => {
                  const message = err || 'Failed to get bots'
                  logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
                  sendErrorResponse(res, 500, '', `Failed to get bots ${err}}`)
                })
            })
            .catch(err => {
              const message = err || 'Failed to get sessions'
              logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
              sendErrorResponse(res, 500, '', `Failed to get sessions ${err}}`)
            })
        })
        .catch(err => {
          const message = err || 'Failed to get pages'
          logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, '', `Failed to get pages ${err}}`)
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sentVsSeen`, {}, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

exports.stats = function (req, res) {
  let payload = {}

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
        .then((pages) => {
          populateIds(pages).then(result => {
            payload.pages = pages.length
            callApi('pages/query', 'post', {companyId: companyUser.companyId, isApproved: true})
              .then(allPages => {
                let removeDuplicates = (myArr, prop) => {
                  return myArr.filter((obj, pos, arr) => {
                    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
                  })
                }
                let allPagesWithoutDuplicates = removeDuplicates(allPages, 'pageId')

                payload.totalPages = allPagesWithoutDuplicates.length
                callApi('subscribers/query', 'post', {companyId: companyUser.companyId, completeInfo: true, isSubscribed: true, pageId: {$in: result.pageIds}})
                  .then(subscribers => {
                    // logger.serverLog(TAG, `subscribers retrieved: ${subscribers}`, 'error')
                    payload.subscribers = subscribers.length
                    let mappedUnreadCounts = subscribers.map(subscriber => subscriber.unreadCount)
                    payload.unreadCount = mappedUnreadCounts.reduce((a, b) => a + b, 0)
                    sendSuccessResponse(res, 200, payload)
                    // const pagesArray = pages.map(page => page.pageId).map(String)
                    // callApi('livechat/query', 'post', {purpose: 'findAll', match: {company_id: companyUser.companyId, status: 'unseen', format: 'facebook', recipient_fb_id: {$in: pagesArray}}}, 'kibochat')
                    //   .then(messages => {
                    //     payload.unreadCount = messages && messages.length > 0 ? messages.length : 0
                    //     sendSuccessResponse(res, 200, payload)
                    //   })
                    //   .catch()
                  })
                  .catch(err => {
                    const message = err || 'failed to get livechat messages'
                    logger.serverLog(message, `${TAG}: exports.stats`, {}, {user: req.user, params: req.params}, 'error')
                    sendErrorResponse(res, 500, '', `failed to get livechat messages ${err}`)
                  })
              })
          })
            .catch(err => {
              const message = err || 'failed to get allPages'
              logger.serverLog(message, `${TAG}: exports.stats`, {}, {user: req.user, params: req.params}, 'error')
              sendErrorResponse(res, 500, '', `failed to get allPages ${err}`)
            })
        })
        .catch(err => {
          const message = err || 'failed to get connected pages'
          logger.serverLog(message, `${TAG}: exports.stats`, {}, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, '', `failed to get connected pages ${err}`)
        })
    })
    .catch(err => {
      const message = err || 'failed to get companyuser'
      logger.serverLog(message, `${TAG}: exports.stats`, {}, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, '', `failed to get companyuser ${err}`)
    })
}

exports.toppages = function (req, res) {
  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
        .then(pages => {
          callApi('subscribers/aggregate', 'post', [
            {$match: {companyId: companyUser.companyId, completeInfo: true}}, {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }])
            .then(gotSubscribersCount => {
              let pagesPayload = []
              for (let i = 0; i < pages.length; i++) {
                pagesPayload.push({
                  _id: pages[i]._id,
                  pageId: pages[i].pageId,
                  pageName: pages[i].pageName,
                  userId: pages[i].userId,
                  pagePic: pages[i].pagePic,
                  connected: pages[i].connected,
                  pageUserName: pages[i].pageUserName,
                  likes: pages[i].likes,
                  subscribers: 0
                })
              }
              for (let i = 0; i < pagesPayload.length; i++) {
                for (let j = 0; j < gotSubscribersCount.length; j++) {
                  if (pagesPayload[i]._id.toString() ===
                          gotSubscribersCount[j]._id.pageId.toString()) {
                    pagesPayload[i].subscribers = gotSubscribersCount[j].count
                  }
                }
              }
              let sorted = sortBy(pagesPayload, 'subscribers')
              let top10 = _.takeRight(sorted, 10)
              top10 = top10.reverse()
              sendSuccessResponse(res, 200, top10)
            })
            .catch(err => {
              if (err) {
                const message = err || 'Error in getting pages subscriber count'
                logger.serverLog(message, `${TAG}: exports.toppages`, {}, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', `Error in getting pages subscriber count ${err}`)
              }
            })
        })
        .catch(err => {
          if (err) {
            const message = err || 'Error in getting pages'
            logger.serverLog(message, `${TAG}: exports.toppages`, {}, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Error in getting pages ${err}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Error in getting company user object'
        logger.serverLog(message, `${TAG}: exports.toppages`, {}, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}
function graphDataNew (body, companyUser, pagesArray) {
  return new Promise(function (resolve, reject) {
    let match = {
      company_id: companyUser.companyId.toString(),
      'page_id': {$in: pagesArray},
      'request_time': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
    }
    let group = {
      _id: {'year': {$year: '$request_time'}, 'month': {$month: '$request_time'}, 'day': {$dayOfMonth: '$request_time'}, 'company': '$company_id'},
      count: {$sum: 1}
    }
    callApi('sessions/query', 'post', {purpose: 'aggregate', match, group}, 'kibochat')
      .then(sessionsgraphdata => {
        resolve({ sessionsgraphdata: sessionsgraphdata })
      })
      .catch(err => {
        const message = err || 'Error in getting sessions'
        logger.serverLog(message, `${TAG}: exports.graphDataNew`, {}, {body, companyUser, pagesArray}, 'error')
        reject(err)
      })
  })
}
exports.graphData = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 500, '', 'The user account does not belong to any company. Please contact support')
      }
      let match = {
        company_id: companyUser.companyId.toString(),
        'request_time': {
          $gte: new Date(
            (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
          $lt: new Date(
            (new Date().getTime()))
        }
      }
      let group = {
        _id: {'year': {$year: '$request_time'}, 'month': {$month: '$request_time'}, 'day': {$dayOfMonth: '$request_time'}, 'company': '$company_id'},
        count: {$sum: 1}
      }
      callApi('sessions/query', 'post', {purpose: 'aggregate', match, group}, 'kibochat')
        .then(sessionsgraphdata => {
          sendSuccessResponse(res, 200, {sessionsgraphdata})
        })
        .catch(err => {
          const message = err || 'Error in getting sessions count'
          logger.serverLog(message, `${TAG}: exports.graphData`, {}, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, '', `Error in getting sessions count ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Error in getting company user'
        logger.serverLog(message, `${TAG}: exports.graphData`, {}, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}
function populateIds (pages) {
  return new Promise(function (resolve, reject) {
    let pageIds = []
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        pageIds.push(pages[i]._id)
        if (pageIds.length === pages.length) {
          resolve({pageIds: pageIds})
        }
      }
    } else {
      resolve({pageIds: pageIds})
    }
  })
}
exports.subscriberSummary = function (req, res) {
  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi(`pages/query`, 'post', {connected: true, companyId: companyUser.companyId}) // fetch connected pages
        .then(pages => {
          populateIds(pages).then(result => {
            callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true, result.pageIds))
              .then(subscribers => {
                callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false, result.pageIds))
                  .then(unsubscribes => {
                    callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser, true, result.pageIds))
                      .then(graphdata => {
                        let data = {
                          subscribes: subscribers.length > 0 ? subscribers[0].count : 0,
                          unsubscribes: unsubscribes.length > 0 ? unsubscribes[0].count : 0,
                          graphdata: graphdata
                        }
                        sendSuccessResponse(res, 200, data)
                      })
                      .catch(err => {
                        const message = err || 'Error in getting graphdata'
                        logger.serverLog(message, `${TAG}: exports.subscriberSummary`, {}, {user: req.user}, 'error')
                        sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Error in getting unsubscribers'
                    logger.serverLog(message, `${TAG}: exports.subscriberSummary`, {}, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                const message = err || 'Error in getting subscribers'
                logger.serverLog(message, `${TAG}: exports.subscriberSummary`, {}, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
              })
          })
        })
        .catch(err => {
          const message = err || 'Error in getting pages'
          logger.serverLog(message, `${TAG}: exports.subscriberSummary`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in getting company users'
      logger.serverLog(message, `${TAG}: exports.subscriberSummary`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
