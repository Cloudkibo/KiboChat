const NotificationsDataLayer = require('./notifications.datalayer')

exports.index = function (req, res) {
  NotificationsDataLayer.genericFind({agentId: req.user._id})
    .then(notifications => {
      return res.status(201).json({status: 'success', payload: {notifications: notifications}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch notifications ${JSON.stringify(error)}`})
    })
}
exports.create = function (req, res) {
  req.body.agentIds.forEach((agentId, i) => {
    NotificationsDataLayer.createNotificationObject({
      message: req.body.message,
      category: req.body.category,
      agentId: agentId,
      companyId: req.body.companyId
    })
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
  NotificationsDataLayer.updateOneNotification(req.body.notificationId, {seen: true})
    .then(updated => {
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update notification ${JSON.stringify(error)}`})
    })
}
