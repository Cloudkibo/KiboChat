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
    notification.agentId = agentId
    callApi(`notifications`, 'post', notification, 'kibochat')
      .then(savedNotification => cb())
      .catch(err => cb(err))
  }, function (err) {
    if (err) {
      logger.serverLog(TAG, err, 'error')
    } else {
      logger.serverLog(TAG, 'Notifications have been saved')
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
