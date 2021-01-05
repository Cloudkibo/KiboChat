const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')

exports.runLiveChatNotificationScript = function () {
  let query = {
    purpose: 'aggregate',
    match: {type: 'adminAlert'},
    limit: 500
  }
  unresolvedSession(query)
}

function unresolvedSession (findAdminAlerts) {
  findAdminAlerts.match['payload.type'] = 'unresolved_session'
  utility.callApi(`cronStack/query`, 'post', findAdminAlerts, 'kibochat')
    .then(cronStacks => {
      if (cronStacks.length > 0) {
        let deletedAlerts = 0
        async.each(cronStacks, function (cronStack, cb) {
          let query = {
            purpose: 'findOne',
            match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform, type: 'unresolved_session'}
          }
          utility.callApi(`alerts/query`, 'post', query, 'kibochat')
            .then(messageAlert => {
              if (messageAlert && messageAlert.enabled) {
                let currentTime = moment(new Date())
                let sessionTime = moment(cronStack.datetime)
                let duration = moment.duration(currentTime.diff(sessionTime))
                // if (duration.asHours() > messageAlert.interval) {
                  _sendAlerts(cronStack, messageAlert, deletedAlerts, cb)
                // } else {
                //   cb()
                // }
              } else {
                _deleteCronStackRecord(cronStack, deletedAlerts, cb)
              }
            })
            .catch(error => {
              cb(error)
            })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to send alerts'
            logger.serverLog(message, `${TAG}: unresolvedSession`, {}, {cronStacks}, 'error')
          } else {
            findAdminAlerts.match['_id'] = {$gt: cronStacks[cronStacks.length - 1]._id}
            unresolvedSession(findAdminAlerts)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Unable to fetch cron stack'
      logger.serverLog(message, `${TAG}: exports.runLiveChatNotificationScript`, {}, {findAdminAlerts}, 'error')
    })
}

function _sendAlerts (cronStack, messageAlert, deletedAlerts, cb) {
  let query = {
    purpose: 'findAll',
    match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform}
  }
  utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscriptions => {
      if (subscriptions.length > 0) {
        let name = cronStack.payload.subscriber.name
        let notificationMessage = ''
        if (cronStack.payload.type === 'unresolved_session') {
          notificationMessage = `Subscriber ${name} session is unresolved and sitting in an open sessions queue for the last ${messageAlert.interval} hour(s).`
        } else if (messageAlert.payload.type === 'pending_session') {
          notificationMessage = `Subscriber ${name} session is in pending state for the last ${messageAlert.interval} minute(s) and they are waiting for an agent to respond to them.`
        } else if (messageAlert.payload.type === 'talk_to_agent') {
          notificationMessage = `Subscriber ${name} have selected the "Talk to agent" option from {{chatbot name}} chatbot and they are waiting for an agent to respond to them`
        }
        let notificationSubscriptions = subscriptions.filter(s => s.alertChannel === 'notification')
        let messengerSubscriptions = subscriptions.filter(s => s.alertChannel === 'messenger')
        let whatsAppSubscriptions = subscriptions.filter(s => s.alertChannel === 'whatsApp')
        let emailSubscriptions = subscriptions.filter(s => s.alertChannel === 'email')
        let data = {
          cronStack,
          messageAlert,
          notificationSubscriptions,
          messengerSubscriptions,
          whatsAppSubscriptions,
          emailSubscriptions,
          notificationMessage
        }
        async.parallelLimit([
          _sendInAppNotification.bind(null, data)
        ], 10, function (err, results) {
          if (err) {
            cb(err)
          } else {
            _deleteCronStackRecord(cronStack, deletedAlerts, cb)
          }
        })
      } else {
        _deleteCronStackRecord(cronStack, deletedAlerts, cb)
      }
    })
    .catch(error => {
      cb(error)
    })
}

function _sendInAppNotification (data, next) {
  if (data.notificationSubscriptions.length > 0) {
    async.each(data.notificationSubscriptions, function (subscription, callback) {
      let notification = {
        companyId: data.messageAlert.companyId,
        message: data.notificationMessage,
        agentId: subscription.channelId,
        category: {type: 'message_alert', id: data.cronStack.payload.subscriber._id},
        platform: data.messageAlert.platform
      }
      utility.callApi(`notifications`, 'post', notification, 'kibochat')
        .then(savedNotification => {
          utility.callApi(`permissions/query`, 'post', {companyId: data.messageAlert.companyId, userId: subscription.channelId})
            .then(userPermission => {
              if (userPermission.length > 0) {
                userPermission = userPermission[0]
              }
              if (data.cronStack.payload.pageId) {
                if (userPermission.muteNotifications && userPermission.muteNotifications.includes(data.cronStack.payload.pageId)) {
                  notification.muteNotification = true
                } else {
                  notification.muteNotification = false
                }
              } else {
                notification.muteNotification = false
              }
              require('../config/socketio').sendMessageToClient({
                room_id: data.messageAlert.companyId,
                body: {
                  action: 'new_notification',
                  payload: notification
                }
              })
              next()
            })
            .catch(err => {
              next(err)
            })
        })
        .catch(err => next(err))
    })
  } else {
    next()
  }
}

function _deleteCronStackRecord (alert, deletedAlerts, cb) {
  var deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': alert.payload.type,
      'payload.subscriber._id': alert.payload.subscriber._id
    }
  }
  utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
    .then(updatedRecord => {
      deletedAlerts = deletedAlerts + 1
      cb()
    })
    .catch(err => {
      cb(err)
    })
}
