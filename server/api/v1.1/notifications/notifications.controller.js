const LogicLayer = require('./notifications.logiclayer')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  let notificationsData = LogicLayer.getQueryData('', 'findAll', {agentId: req.user._id, companyId: req.user.companyId})
  callApi(`notifications/query`, 'post', notificationsData, 'kibochat')
    .then(notifications => {
      sendSuccessResponse(res, 200, {notifications: notifications})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch notifications ${JSON.stringify(error)}`)
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
          sendErrorResponse(res, 500, `Failed to create notification ${JSON.stringify(error)}`)
        })
    })
  } else {
    sendSuccessResponse(res, 200)
  }
}
exports.markRead = function (req, res) {
  let notificationUpdateData = LogicLayer.getUpdateData('updateOne', {_id: req.body.notificationId}, {seen: true})
  callApi(`notifications/update`, 'put', notificationUpdateData, 'kibochat')
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update notification ${JSON.stringify(error)}`)
    })
}
