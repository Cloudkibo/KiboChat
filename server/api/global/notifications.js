const logger = require('../../components/logger')
const TAG = 'api/global/notifications.js'
const async = require('async')
const { callApi } = require('../v1.1/utility')

exports.saveNotification = (agentIds, companyId, message, category) => {
  let notification = {
    companyId,
    message,
    category
  }
  async.each(agentIds, function (agentId, cb) {
    if (agentId) {
      notification.agentId = agentId
      callApi(`notifications`, 'post', notification, 'kibochat')
        .then(savedNotification => cb())
        .catch(err => cb(err))
    }
  }, function (err) {
    if (err) {
      const message = err || 'error in saveNotification'
      return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, {agentIds, companyId, message, category}, 'error')
    } else {
      require('./../../config/socketio').sendMessageToClient({
        room_id: companyId,
        body: {
          action: 'new_notification',
          payload: notification
        }
      })
    }
  })
}
