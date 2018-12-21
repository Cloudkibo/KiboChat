const logger = require('../../../components/logger')
const TAG = 'api/pages/dashboard.controller.js'
// const mongoose = require('mongoose')
const sortBy = require('sort-array')
// const needle = require('needle')
const util = require('util')
const {callApi} = require('../utility')

let _ = require('lodash')

exports.index = function (req, res) {
  callApi('pages/aggregate', 'post', [], req.headers.authorization)
    .then(pages => {
      const data = {}
      let c = pages.length
      data.pagesCount = c
      res.status(200).json(data)
    })
    .catch(err => {
      if (err) {
        return res.status(500)
          .json({status: 'failed', description: JSON.stringify(err)})
      }
    })
}

exports.sentVsSeen = function (req, res) {
  let pageId = req.params.pageId
  let datacounts = {}

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi('pages/query', 'post', {pageId: pageId}, req.headers.authorization)
        .then(pages => {
          const pagesArray = pages.map(page => page._id).map(String)
          callApi('sessions/query', 'post', {purpose: 'findAll', match: {company_id: companyUser.companyId.toString(), page_id: {$in: pagesArray}}}, '', 'kibochat')
            .then(sessions => {
              const resolvedSessions = sessions.filter(session => session.status === 'resolved')
              datacounts.sessions = {
                count: sessions.length,
                resolved: resolvedSessions.length
              }
              callApi('smart_replies/query', 'post', {purpose: 'findAll', match: {companyId: companyUser.companyId.toString(), pageId: {$in: pagesArray}}}, '', 'kibochat')
                .then(bots => {
                  const hitCountArray = bots.map(bot => bot.hitCount)
                  const missCountArray = bots.map(bot => bot.missCount)
                  const responded = hitCountArray.reduce((a, b) => a + b, 0)
                  const notResponded = missCountArray.reduce((a, b) => a + b, 0)
                  datacounts.bots = {
                    count: responded + notResponded,
                    responded
                  }
                  console.log(`datacounts ${util.inspect(datacounts)}`)
                  res.status(200).json({
                    status: 'success',
                    payload: datacounts
                  })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Failed to get bots ${err}}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to get sessions ${err}}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Failed to get pages ${err}}`
          })
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.stats = function (req, res) {
  let payload = {}

  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId}, req.headers.authorization)
        .then((pages) => {
          payload.pages = pages.length
          callApi('pages/query', 'post', {companyId: companyUser.companyId}, req.headers.authorization)
            .then(allPages => {
              let removeDuplicates = (myArr, prop) => {
                return myArr.filter((obj, pos, arr) => {
                  return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
                })
              }
              let allPagesWithoutDuplicates = removeDuplicates(allPages, 'pageId')
              payload.totalPages = allPagesWithoutDuplicates.length
              callApi('subscribers/query', 'post', {companyId: companyUser.companyId, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization)
                .then(subscribers => {
                  logger.serverLog(TAG, `subscribers retrieved: ${subscribers}`)
                  payload.subscribers = subscribers.length
                  callApi('livechat/query', 'post', {purpose: 'findAll', match: {company_id: companyUser.companyId, status: 'unseen', format: 'facebook'}}, '', 'kibochat')
                    .then(messages => {
                      payload.unreadCount = messages.length
                      res.status(200).json({
                        status: 'success',
                        payload
                      })
                    })
                    .catch()
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `failed to get livechat messages ${err}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `failed to get allPages ${err}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `failed to get connected pages ${err}`})
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `failed to get companyuser ${err}`
      })
    })
}

exports.toppages = function (req, res) {
  callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId}, req.headers.authorization)
        .then(pages => {
          callApi('subscribers/aggregate', 'post', [
            {$match: {companyId: companyUser.companyId}}, {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }], req.headers.authorization)
            .then(gotSubscribersCount => {
              logger.serverLog(TAG, `pages: ${pages}`)
              logger.serverLog(TAG, `gotSubscribersCount ${gotSubscribersCount}`)
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
              logger.serverLog(TAG, `pagesPayload: ${pagesPayload}`)
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
              res.status(200).json({
                status: 'success',
                payload: top10
              })
            })
            .catch(err => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages subscriber count ${err}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(404).json({
              status: 'failed',
              description: `Error in getting pages ${err}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.graphData = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
      callApi.callApi('sessions/query', 'post', {purpose: 'aggregate', match, group}, '', 'kibochat')
        .then(sessionsgraphdata => {
          return res.status(200)
            .json({status: 'success', payload: {sessionsgraphdata}})
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting sessions count ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}
