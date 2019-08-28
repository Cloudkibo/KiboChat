const logicLayer = require('./subscribers.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/subscribers/subscribers.controller.js'
const util = require('util')
const needle = require('needle')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isSubscribed: true }) // fetch subscribers of company
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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isEnabledByPage: true }) // fetch subscribers of company
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

const getAllSubscribers = function (subscribers, count, req, res) {
  var dt = new Date()
  var utcDate = dt.toUTCString()
  dt = new Date()
  utcDate = dt.toUTCString()
  logger.serverLog(TAG, `subscribers/aggregate data subscribers ${utcDate}`, 'info')
  let subscriberIds = logicLayer.getSubscriberIds(subscribers)
  logger.serverLog(TAG, `subscriberIds: ${util.inspect(subscriberIds)}`, 'debug')
  utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, isList: false, defaultTag: false })
    .then(tags => {
      dt = new Date()
      utcDate = dt.toUTCString()
      logger.serverLog(TAG, `tags/query ${utcDate}`, 'info')

      let tagIds = tags.map((t) => t._id)
      utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds }, tagId: {$in: tagIds} })
        .then(tagSubscribers => {
          dt = new Date()
          utcDate = dt.toUTCString()
          logger.serverLog(TAG, `tags_subscriber/query data subscribers ${utcDate}`, 'info')
        //  logger.serverLog(TAG, `tags subscribers: ${util.inspect(tagSubscribers)}`, 'debug')
          let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tagSubscribers, tagIds, req.body.filter_criteria.tag_value)
          //logger.serverLog(TAG, `subscribersPayload: ${util.inspect(subscribersPayload)}`, 'debug')
          // start append custom Fields
          utility.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { companyId: req.user.companyId } })
            .then(customFields => {
              dt = new Date()
              utcDate = dt.toUTCString()
              logger.serverLog(TAG, `custom_fields/query ${utcDate}`, 'info')
              // logger.serverLog(TAG, `customFields: ${util.inspect(customFields)}`, 'debug')
              let customFieldIds = customFields.map((cf) => cf._id)
              utility.callApi('custom_field_subscribers/query', 'post', {purpose: 'findAll', match: {subscriberId: {$in: subscriberIds}, customFieldId: {$in: customFieldIds}}})
                .then(customFieldSubscribers => {
                  dt = new Date()
                  utcDate = dt.toUTCString()
                  logger.serverLog(TAG, `customFieldSubscribers/query ${utcDate}`, 'info')
                  logger.serverLog(TAG, `customFieldSubscribers: ${util.inspect(customFieldSubscribers)}`, 'debug')
                  let finalPayload = logicLayer.getFinalPayload(subscribersPayload, customFields, customFieldSubscribers)
                  logger.serverLog(TAG, `subscribersFinalPayload: ${util.inspect(finalPayload)}`, 'debug')
                  dt = new Date()
                  utcDate = dt.toUTCString()
                  logger.serverLog(TAG, `before send success response ${utcDate}`, 'info')
                  sendSuccessResponse(res, 200, {subscribers: finalPayload, count: count.length > 0 ? count[0].count : 0})
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to fetch custom_Field_subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch custom_Fields ${JSON.stringify(error)}`)
            })
        })
        // end append custom Fields
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch tags subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch tags ${JSON.stringify(error)}`)
    })

}
exports.getAll = function (req, res) {
  var dt = new Date()
  var utcDate = dt.toUTCString()
  logger.serverLog(TAG, `starting function time ${utcDate}`, 'info')
  let tagIDs = []
  let tagValue = []
  if (req.body.filter_criteria.tag_value) {
    tagValue.push(req.body.filter_criteria.tag_value)
    utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: tagValue } })
      .then(tags => {
        dt = new Date()
        utcDate = dt.toUTCString()
        logger.serverLog(TAG, `After tags Query ${utcDate}`, 'info')
        tagIDs = tags.map((tag) => tag._id)
        console.log('tagIDs', tagIDs)
        let criterias = logicLayer.getCriteriasTags(req, tagIDs)
        utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
          .then(count => {
            console.log('subscribers by filter count', count)

            logger.serverLog(TAG, `tags_subscribers/aggregate count ${utcDate}`, 'info')
            utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers count
              .then(subscribers => {
                console.log('subscribers by filter', subscribers)
                let new_subscribers = []
                subscribers.forEach((subscriber, index) => {
                  let new_subscriber = subscriber.Subscribers
                  new_subscriber.pageId = subscriber.pageId
                  new_subscribers.push(new_subscriber)
                })
                console.log('new_subscribers', new_subscribers)
                getAllSubscribers(new_subscribers, count, req, res)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch subscriber data  ${JSON.stringify(err)}`, 'error')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch subscriber count  ${JSON.stringify(err)}`, 'error')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch tag  ${JSON.stringify(err)}`, 'error')
      })
  }
  else {
    dt = new Date()
    utcDate = dt.toUTCString()
    logger.serverLog(TAG, `After tags Query Loop  ${utcDate}`, 'info')
    let criterias = logicLayer.getCriterias(req, tagIDs)
    utility.callApi(`subscribers/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
      .then(count => {
        dt = new Date()
        utcDate = dt.toUTCString()
        logger.serverLog(TAG, `subscribers/aggregate count ${utcDate}`, 'info')

        utility.callApi(`subscribers/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
          .then(subscribers => {
            getAllSubscribers(subscribers, count, req, res)
          })
          .catch(error => {
            sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
          })
      })
      .catch(error => {
        sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
      })
  }
}

exports.subscribeBack = function (req, res) {
  utility.callApi(`subscribers/update`, 'put', { query: { _id: req.params.id, unSubscribedBy: 'agent' }, newPayload: { isSubscribed: true, unSubscribedBy: 'subscriber' }, options: {} }) // fetch single subscriber
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
  // console.log('hit the updatePicture endpoint', req.body)
  utility.callApi('subscribers/updatePicture', 'post', req.body)
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
  utility.callApi('subscribers/updateData', 'get', {}, 'accounts', req.headers.authorization)
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

  let companyUserResponse = utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
  let pageResponse = utility.callApi(`pages/${req.body.page_id}`, 'get', {})
  let subscriberResponse = utility.callApi(`subscribers/${req.body.subscriber_id}`, 'get', {})
  let updateSubscriberResponse = utility.callApi(`subscribers/update`, 'put', {
    query: { _id: req.body.subscriber_id },
    newPayload: { isSubscribed: false, unSubscribedBy: 'agent' },
    options: {}
  })

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
            recipient: JSON.stringify({ id: subscriber.senderId }), // this is the subscriber id
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
              res.status(200).json({ status: 'success', payload: updated })
            })
        })
    })
    .catch(err => {
      res.status(500).json({ status: 'failed', payload: `Failed to fetch user ${JSON.stringify(err)}` })
    })
}
function saveNotifications (companyUser, subscriber, req) {
  let companyUserResponse = utility.callApi(`companyUser/query`, 'post', { companyId: companyUser.companyId })

  companyUserResponse.then(member => {
    let notificationsData = {
      message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${req.user.name}`,
      category: { type: 'unsubscribe', id: subscriber._id },
      agentId: member.userId._id,
      companyId: subscriber.companyId
    }
    return utility.callApi('notifications', 'post', notificationsData, 'kibochat')
  })
    .then(savedNotification => { })
    .catch(error => {
      logger.serverLog(TAG, `Failed to create notification ${JSON.stringify(error)}`)
    })
}
