const logicLayer = require('./subscribers.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/subscribers/subscribers.controller.js'
const needle = require('needle')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isSubscribed: true, completeInfo: true }) // fetch subscribers of company
        .then(subscribers => {
          subscribers = subscribers.filter((subscriber) => subscriber.pageId.connected === true)
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds } })
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              return res.status(200).json({
                status: 'success',
                payload: subscribersPayload
              })
            })
            .catch(error => {
              const message = error || 'Failed to fetch tags subscribers'
              logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscribers'
          logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
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

exports.allSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isEnabledByPage: true, completeInfo: true }) // fetch subscribers of company
        .then(subscribers => {
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds } })
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              return res.status(200).json({
                status: 'success',
                payload: subscribersPayload
              })
            })
            .catch(error => {
              const message = error || 'Failed to fetch tags subscribers'
              logger.serverLog(message, `${TAG}: exports.allSubscribers`, {}, {user: req.user}, 'error')
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscribers'
          logger.serverLog(message, `${TAG}: exports.allSubscribers`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.allSubscribers`, {}, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.allLocales = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateObject = [{ $group: { _id: null, locales: { $addToSet: '$locale' } } }]
      utility.callApi(`subscribers/aggregate`, 'post', aggregateObject) // fetch subscribers locales
        .then(locales => {
          return res.status(200).json({
            status: 'success',
            payload: locales[0].locales
          })
        })
        .catch(error => {
          const message = error || 'Failed to fetch locales'
          logger.serverLog(message, `${TAG}: exports.allLocales`, {}, {user: req.user}, 'error')
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch locales ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.allLocales`, {}, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

const getAllSubscribers = function (subscribers, count, req, res) {
  var dt = new Date()
  dt = new Date()
  let subscriberIds = logicLayer.getSubscriberIds(subscribers)
  utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId })
    .then(tags => {
      dt = new Date()
      let tagIds = tags.map((t) => t._id)
      utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds }, tagId: {$in: tagIds} })
        .then(tagSubscribers => {
          dt = new Date()
          let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tagSubscribers, tagIds, req.body.filter_criteria.tag_value)
          // start append custom Fields
          utility.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: req.user.companyId}, {default: true}] } })
            .then(customFields => {
              dt = new Date()
              let customFieldIds = customFields.map((cf) => cf._id)
              utility.callApi('custom_field_subscribers/query', 'post', {purpose: 'findAll', match: {subscriberId: {$in: subscriberIds}, customFieldId: {$in: customFieldIds}}})
                .then(customFieldSubscribers => {
                  dt = new Date()
                  let finalPayload = logicLayer.getFinalPayload(subscribersPayload, customFields, customFieldSubscribers)
                  dt = new Date()
                  sendSuccessResponse(res, 200, {subscribers: finalPayload, count: count.length > 0 ? count[0].count : 0})
                })
                .catch(error => {
                  const message = error || 'Failed to fetch custom_Field_subscribers'
                  logger.serverLog(message, `${TAG}: exports.getAllSubscribers`, {}, {user: req.user, subscribers}, 'error')
                  sendErrorResponse(res, 500, `Failed to fetch custom_Field_subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Failed to fetch custom_Fields'
              logger.serverLog(message, `${TAG}: exports.getAllSubscribers`, {}, {user: req.user, subscribers}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch custom_Fields ${JSON.stringify(error)}`)
            })
        })
        // end append custom Fields
        .catch(error => {
          const message = error || 'Failed to fetch tags subscribers'
          logger.serverLog(message, `${TAG}: exports.getAllSubscribers`, {}, {user: req.user, subscribers}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch tags subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch tags'
      logger.serverLog(message, `${TAG}: exports.getAllSubscribers`, {}, {user: req.user, subscribers}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch tags ${JSON.stringify(error)}`)
    })
}
exports.getAll = function (req, res) {
  var dt = new Date()
  let tagIDs = []
  let tagValue = []
  if (req.body.filter_criteria.tag_value) {
    tagValue.push(req.body.filter_criteria.tag_value)
    utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: tagValue } })
      .then(tags => {
        dt = new Date()
        tagIDs = tags.map((tag) => tag._id)
        let criterias = logicLayer.getCriteriasTags(req, tagIDs)
        utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
          .then(count => {
            utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers count
              .then(subscribers => {
                let newSubscribersArray = []
                subscribers.forEach((subscriber, index) => {
                  let newSubscriberTemp = subscriber.Subscribers
                  newSubscriberTemp.pageId = subscriber.pageId
                  newSubscribersArray.push(newSubscriberTemp)
                })
                getAllSubscribers(newSubscribersArray, count, req, res)
              })
              .catch(err => {
                const message = err || 'Failed to fetch subscriber data'
                logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
              })
          })
          .catch(err => {
            const message = err || 'Failed to fetch subscriber count'
            logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
          })
      })
      .catch(err => {
        const message = err || 'Failed to fetch tag'
        logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
      })
  } else {
    dt = new Date()
    let criterias = logicLayer.getCriterias(req, tagIDs)
    utility.callApi(`subscribers/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
      .then(count => {
        dt = new Date()
        utility.callApi(`subscribers/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
          .then(subscribers => {
            getAllSubscribers(subscribers, count, req, res)
          })
          .catch(error => {
            const message = error || 'Failed to fetch subscribers'
            logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
          })
      })
      .catch(error => {
        const message = error || 'Failed to fetch subscribers count'
        logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
      })
  }
}

exports.subscribeBack = function (req, res) {
  utility.callApi(`subscribers/update`, 'put', { query: { _id: req.params.id, unSubscribedBy: 'agent' }, newPayload: { isSubscribed: true, unSubscribedBy: 'subscriber' }, options: {} }) // fetch single subscriber
    .then(subscriber => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'Messenger_subscribe_subscriber',
          payload: {
            subscriber_id: req.params.id,
            user_id: req.user._id,
            user_name: req.user.name
          }
        }
      })
      return res.status(200).json({
        status: 'success',
        payload: subscriber
      })
    })
    .catch(error => {
      const message = error || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: exports.getAll`, {}, {params: req.params}, 'error')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscriber ${JSON.stringify(error)}`
      })
    })
}

exports.updatePicture = function (req, res) {
  utility.callApi('subscribers/updatePicture', 'post', req.body)
    .then(update => {
      return res.status(200).json({
        status: 'success',
        payload: update
      })
    })
    .catch(err => {
      const message = err || 'Failed to fetch subscriber Picture'
      logger.serverLog(message, `${TAG}: exports.updatePicture`, req.body, {user: req.user}, 'debug')
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update subscriber data ${JSON.stringify(err)}`
      })
    })
}

exports.updateData = function (req, res) {
  utility.callApi('subscribers/updateData', 'get', {}, 'accounts', req.headers.authorization)
    .then(updatedSubscribers => {
      return res.status(200).json({
        status: 'success',
        payload: updatedSubscribers
      })
    })
    .catch(err => {
      const message = err || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: exports.updateData`, req.body, {user: req.user}, 'error')
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

  let pageResponse = utility.callApi(`pages/${req.body.page_id}`, 'get', {})
  let subscriberResponse = utility.callApi(`subscribers/${req.body.subscriber_id}`, 'get', {})
  let updateSubscriberResponse = utility.callApi(`subscribers/update`, 'put', {
    query: { _id: req.body.subscriber_id },
    newPayload: { isSubscribed: false, unSubscribedBy: 'agent' },
    options: {}
  })

  pageResponse.then(page => {
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
      return utility.callApi(`user/query`, 'post', { _id: userPage.userId._id })
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
        `https://graph.facebook.com/v6.0/${userPage.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
        (err, resp) => {
          if (err) {
            const message = err || 'Page access token from graph api error'
            logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {}, 'error')
          }
          const messageData = {
            text: 'We have unsubscribed you from our page. We will notify you when we subscribe you again. Thanks'
          }
          const data = {
            messaging_type: 'UPDATE',
            recipient: JSON.stringify({ id: subscriber.senderId }), // this is the subscriber id
            message: messageData
          }
          needle.post(
            `https://graph.facebook.com/v6.0/me/messages?access_token=${resp.body.access_token}`,
            data, (err, resp) => {
              if (err) {
                const message = err || 'Failed to call fb api'
                logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {user: req.user}, 'error')
                return res.status(500).json({
                  status: 'failed',
                  description: JSON.stringify(err)
                })
              }
              require('./../../../config/socketio').sendMessageToClient({
                room_id: req.user.companyId,
                body: {
                  action: 'Messenger_unsubscribe_subscriber',
                  payload: {
                    subscriber_id: req.body.subscriber_id,
                    user_id: req.user._id,
                    user_name: req.user.name
                  }
                }
              })
              res.status(200).json({ status: 'success', payload: updated })
            })
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch user'
      logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {user: req.user}, 'error')
      res.status(500).json({ status: 'failed', payload: `Failed to fetch user ${JSON.stringify(err)}` })
    })
}
function saveNotifications (companyUser, subscriber, req) {
  let notificationsData = {
    message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${req.user.name}`,
    category: { type: 'unsubscribe', id: subscriber._id },
    agentId: req.user._id,
    companyId: subscriber.companyId
  }
  utility.callApi('notifications', 'post', notificationsData, 'kibochat')
    .then(savedNotification => { })
    .catch(error => {
      const message = error || 'Failed to create notification'
      logger.serverLog(message, `${TAG}: exports.saveNotifications`, {}, { companyUser, subscriber }, 'error')
    })
}
