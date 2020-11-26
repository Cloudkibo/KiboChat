const LogicLayer = require('./notifications.logiclayer')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/notifications/notifications.controller.js'

exports.index = function (req, res) {
  const data = {
    user: req.user,
    lastId: req.body.lastId,
    records: req.body.records ? req.body.records : 50
  }
  async.parallelLimit([
    _fetchTotalCount.bind(null, data),
    _fetchUnreadCount.bind(null, data),
    _fetchNotifications.bind(null, data)
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'error from async calls'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, `Failed to fetch notifications ${JSON.stringify(err)}`)
    } else {
      const totalCount = results[0].length > 0 ? results[0][0].count : 0
      const unreadCount = results[1].length > 0 ? results[1][0].count : 0
      const notifications = results[2]
      return sendSuccessResponse(res, 200, {totalCount, unreadCount, notifications})
    }
  })
}

const _fetchTotalCount = (data, cb) => {
  const criteria = {
    purpose: 'aggregate',
    query: [
      {$match: {
        agentId: data.user._id,
        companyId: data.user.companyId,
        platform: data.user.platform
      }},
      {$group: {_id: null, count: {$sum: 1}}}
    ]
  }
  callApi(`notifications/query`, 'post', criteria, 'kibochat')
    .then(count => {
      cb(null, count)
    })
    .catch(error => {
      cb(error)
    })
}

const _fetchUnreadCount = (data, cb) => {
  const criteria = {
    purpose: 'aggregate',
    query: [
      {$match: {
        agentId: data.user._id,
        companyId: data.user.companyId,
        platform: data.user.platform,
        seen: false
      }},
      {$group: {_id: null, count: {$sum: 1}}}
    ]
  }
  callApi(`notifications/query`, 'post', criteria, 'kibochat')
    .then(count => {
      cb(null, count)
    })
    .catch(error => {
      cb(error)
    })
}

const _fetchNotifications = (data, cb) => {
  const criteria = {
    purpose: 'aggregate',
    query: [
      {$sort: {_id: -1}},
      {$match: {
        agentId: data.user._id,
        companyId: data.user.companyId,
        platform: data.user.platform,
        _id: data.lastId ? {$lt: data.lastId} : {$exists: true}
      }},
      {$limit: data.records}
    ]
  }
  callApi(`notifications/query`, 'post', criteria, 'kibochat')
    .then(notifications => {
      cb(null, notifications)
    })
    .catch(error => {
      cb(error)
    })
}

exports.create = function (req, res) {
  if (req.body.agentIds.length > 0) {
    req.body.agentIds.forEach((agentId, i) => {
      let notificationsData = {
        message: req.body.message,
        category: req.body.category,
        agentId: agentId,
        companyId: req.body.companyId
      }
      callApi(`notifications`, 'post', notificationsData, 'kibochat')
        .then(savedNotification => {
          if (i === (req.body.agentIds.length - 1)) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.body.companyId,
              body: {
                action: 'new_notification',
                payload: req.body
              }
            })
            sendSuccessResponse(res, 200, savedNotification)
          }
        })
        .catch(error => {
          const message = error || 'Failed to create notification'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create notification ${JSON.stringify(error)}`)
        })
    })
  } else {
    sendSuccessResponse(res, 200)
  }
}
exports.markRead = function (req, res) {
  let notificationUpdateData = LogicLayer.getUpdateData('updateOne', {_id: req.body.notificationId}, {seen: true})
  callApi(`notifications`, 'put', notificationUpdateData, 'kibochat')
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      const message = error || 'Failed to update notification'
      logger.serverLog(message, `${TAG}: exports.markRead`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to update notification ${error}`)
    })
}
