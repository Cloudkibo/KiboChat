const LogicLayer = require('./notifications.logiclayer')
const { callApi } = require('../utility')

exports.index = function (req, res) {
  let notificationsData = LogicLayer.getQueryData('', 'findAll', {agentId: req.user._id})
  callApi(`notifications/query`, 'post', notificationsData, '', 'kibochat')
    .then(notifications => {
      return res.status(201).json({status: 'success', payload: {notifications: notifications}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch notifications ${JSON.stringify(error)}`})
    })
}
exports.create = function (req, res) {
  req.body.agentIds.forEach((agentId, i) => {
    let notificationsData = {
      message: req.body.message,
      category: req.body.category,
      agentId: agentId,
      companyId: req.body.companyId
    }
    callApi(`notifications`, 'post', notificationsData, '', 'kibochat')
      .then(savedNotification => {
        if (i === (req.body.agentIds.length - 1)) {
          return res.status(200).json({status: 'success', payload: savedNotification})
        }
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to create notification ${JSON.stringify(error)}`})
      })
  })
}
exports.markRead = function (req, res) {
  let notificationUpdateData = LogicLayer.getUpdateData('updateOne', {_id: req.body.notificationId}, {seen: true})
  callApi(`notifications/update`, 'put', notificationUpdateData, '', 'kibochat')
    .then(updated => {
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update notification ${JSON.stringify(error)}`})
    })
}
