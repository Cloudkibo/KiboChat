const logicLayer = require('./subscribers.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/subscribers/subscribers.controller.js'
const util = require('util')
const needle = require('needle')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', {companyId: companyuser.companyId, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization) // fetch subscribers of company
        .then(subscribers => {
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', {subscriberId: {$in: subscriberIds}}, req.headers.authorization)
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              return res.status(200).json({
                status: 'success',
                payload: subscribersPayload
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
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

exports.allSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', {companyId: companyuser.companyId, isEnabledByPage: true}, req.headers.authorization) // fetch subscribers of company
        .then(subscribers => {
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', {subscriberId: {$in: subscriberIds}}, req.headers.authorization)
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              return res.status(200).json({
                status: 'success',
                payload: subscribersPayload
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
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

exports.allLocales = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let aggregateObject = [{$group: {_id: null, locales: {$addToSet: '$locale'}}}]
      utility.callApi(`subscribers/aggregate`, 'post', aggregateObject, req.headers.authorization) // fetch subscribers locales
        .then(locales => {
          return res.status(200).json({
            status: 'success',
            payload: locales[0].locales
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch locales ${JSON.stringify(error)}`
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

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`subscribers/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch subscribers count
        .then(count => {
          utility.callApi(`subscribers/aggregate`, 'post', criterias.fetchCriteria, req.headers.authorization) // fetch subscribers
            .then(subscribers => {
              let subscriberIds = logicLayer.getSubscriberIds(subscribers)
              logger.serverLog(TAG, `subscriberIds: ${util.inspect(subscriberIds)}`)
              utility.callApi(`tags_subscriber/query`, 'post', {subscriberId: {$in: subscriberIds}}, req.headers.authorization)
                .then(tags => {
                  logger.serverLog(TAG, `tags: ${util.inspect(tags)}`)
                  let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
                  logger.serverLog(TAG, `subscribersPayload: ${util.inspect(subscribersPayload)}`)
                  return res.status(200).json({
                    status: 'success',
                    payload: {subscribers: subscribersPayload, count: count.length > 0 ? count[0].count : 0}
                  })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscriber count ${JSON.stringify(error)}`
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

exports.subscribeBack = function (req, res) {
  utility.callApi(`subscribers/update`, 'put', {query: {_id: req.params.id, unSubscribedBy: 'agent'}, newPayload: {isSubscribed: true, unSubscribedBy: 'subscriber'}, options: {}}, req.headers.authorization) // fetch single subscriber
    .then(subscriber => {
      return res.status(200).json({
        status: 'success',
        payload: subscriber
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscriber ${JSON.stringify(error)}`
      })
    })
}

exports.updatePicture = function (req, res) {
  console.log('hit the updatePicture endpoint', req.body)
  utility.callApi('subscribers/updatePicture', 'post', req.body, req.headers.authorization)
    .then(update => {
      return res.status(200).json({
        status: 'success',
        payload: update
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update subscriber data ${JSON.stringify(err)}`
      })
    })
}

exports.updateData = function (req, res) {
  utility.callApi('subscribers/updateData', 'get', {}, req.headers.authorization)
    .then(updatedSubscribers => {
      return res.status(200).json({
        status: 'success',
        payload: updatedSubscribers
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscribers ${JSON.stringify(err)}`
      })
    })
}

exports.unSubscribe = function (req, res) {
  let companyUser = {}
  let userPage = {}
  let subscriber = {}
  let updated = {}

  let companyUserResponse = utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
  let pageResponse = utility.callApi(`pages/${req.body.page_id}`, 'get', {}, req.headers.authorization)
  let subscriberResponse = utility.callApi(`subscribers/${req.body.subscriber_id}`, 'get', {}, req.headers.authorization)
  let updateSubscriberResponse = utility.callApi(`subscribers/update`, 'put', {
    query: {_id: req.body.subscriber_id},
    newPayload: {isSubscribed: false, unSubscribedBy: 'agent'},
    options: {}
  }, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    return pageResponse
  })
    .then(page => {
      userPage = page
      return subscriberResponse
    })
    .then(subscriberData => {
      subscriber = subscriberData
      return updateSubscriberResponse
    })
    .then(updatedData => {
      updated = updatedData
      saveNotifications(companyUser, subscriber, req)
      return utility.callApi(`user/query`, 'post', {_id: userPage.userId._id}, req.headers.authorization)
    })
    .then(connectedUser => {
      connectedUser = connectedUser[0]
      var currentUser
      if (req.user.facebookInfo) {
        currentUser = req.user
      } else {
        currentUser = connectedUser
      }
      needle.get(
        `https://graph.facebook.com/v2.10/${userPage.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
        (err, resp) => {
          if (err) {
            logger.serverLog(TAG,
              `Page access token from graph api error ${JSON.stringify(err)}`)
          }
          const messageData = {
            text: 'We have unsubscribed you from our page. We will notify you when we subscribe you again. Thanks'
          }
          const data = {
            messaging_type: 'UPDATE',
            recipient: JSON.stringify({id: subscriber.senderId}), // this is the subscriber id
            message: messageData
          }
          needle.post(
            `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,
            data, (err, resp) => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: JSON.stringify(err)
                })
              }
              require('./../../../config/socketio').sendMessageToClient({
                room_id: companyUser.companyId,
                body: {
                  action: 'unsubscribe',
                  payload: {
                    subscriber_id: req.body.subscriber_id,
                    user_id: req.user._id,
                    user_name: req.user.name
                  }
                }
              })
              res.status(200).json({status: 'success', payload: updated})
            })
        })
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch user ${JSON.stringify(err)}`})
    })
}
function saveNotifications (companyUser, subscriber, req) {
  let companyUserResponse = utility.callApi(`companyUser/query`, 'post', {companyId: companyUser.companyId}, req.headers.authorization)

  companyUserResponse.then(member => {
    let notificationsData = {
      message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${req.user.name}`,
      category: {type: 'unsubscribe', id: subscriber._id},
      agentId: member.userId._id,
      companyId: subscriber.companyId
    }
    return utility.callApi('notifications', 'post', notificationsData, '', 'kibochat')
  })
    .then(savedNotification => {})
    .catch(error => {
      logger.serverLog(TAG, `Failed to create notification ${JSON.stringify(error)}`)
    })
}
