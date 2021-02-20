const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')
const sessionLogicLayer = require('../api/v1.1/sessions/sessions.logiclayer')
const smsSessionLogicLayer = require('../api/v1.1/smsSessions/smsSessions.logiclayer')
const whatsAppSessionLogicLayer = require('../api/v1.1/whatsAppSessions/whatsAppSessions.logiclayer')
const { sendNotifications } = require('../api/global/sendNotification')

exports.runLiveChatNotificationScript = function () {
  // logger.serverLog(TAG, 'runLiveChatNotificationScript')
  sendNotification(0, 15)
}

function sendNotification (skipRecords, LimitRecords) {
  let findAdminAlerts = {
    purpose: 'aggregate',
    match: {type: 'adminAlert'},
    skip: skipRecords,
    limit: LimitRecords
  }
  utility.callApi(`cronStack/query`, 'post', findAdminAlerts, 'kibochat')
    .then(alerts => {
      // logger.serverLog(TAG, `alerts ${JSON.stringify(alerts)} ${JSON.stringify(alerts.length)}`)
      if (alerts.length > 0) {
        let deleteAlerts = 0
        async.each(alerts, function (alert, cb) {
          // logger.serverLog(TAG, `alert ${JSON.stringify(alert)}`)
          if (alert.payload && alert.payload.notification_interval) {
            var now = moment(new Date())
            var sessionTime = moment(alert.datetime)
            var duration = moment.duration(now.diff(sessionTime))
            // logger.serverLog(TAG, `duration ${duration.asMinutes()}`)
            // logger.serverLog(TAG, `notification_interval ${alert.payload.notification_interval}`)
            if (duration.asMinutes() > alert.payload.notification_interval) {
              deleteAlerts = deleteAlerts + 1
              // logger.serverLog(TAG, `duration passed ${duration}`)
              utility.callApi(`companyUser/queryAll`, 'post', {companyId: alert.payload.companyId}, 'accounts')
                .then(companyUsers => {
                  let assignedMembers
                  // logger.serverLog(TAG, `companyUsers ${JSON.stringify(companyUsers)}`)
                  if (alert.payload.assignedMembers === 'buyer') {
                    assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role === 'buyer')
                  } else if (alert.payload.assignedMembers === 'admins') {
                    assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role === 'admin')
                  } else {
                    assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role !== 'agent')
                  }
                  generateAdminMobileNotification(alert, assignedMembers)
                  async.each(assignedMembers, function (assignedMember, callback) {
                    generateAdminNotification(alert, assignedMember, callback)
                  }, function (err) {
                    if (err) {
                      cb(err)
                    }
                    deleteCronStackRecord(alert, cb)
                  })
                })
                .catch(err => {
                  cb(err)
                })
            }
          }
        }, function (err) {
          if (err) {
            const message = err || 'Unable to generate admin alerts'
            logger.serverLog(message, `${TAG}: exports.runLiveChatNotificationScript`, {}, {alerts}, 'error')
          } else {
            sendNotification(skipRecords + LimitRecords - deleteAlerts, LimitRecords)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Unable to fetch cron stack'
      logger.serverLog(message, `${TAG}: exports.runLiveChatNotificationScript`, {}, {findAdminAlerts}, 'error')
    })
}

function deleteCronStackRecord (alert, cb) {
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
      cb()
    })
    .catch(err => {
      cb(err)
    })
}
function generateAdminMobileNotification (alert, users) {
  var name = ''
  var notificationMessage = ''
  if (alert.payload.subscriber.firstName) {
    name = alert.payload.subscriber.firstName + ' ' + alert.payload.subscriber.lastName
  } else if (alert.payload.subscriber.name) {
    name = alert.payload.subscriber.name
  }
  // let title = '[' + pageName + ']: ' + name
  if (alert.payload.type === 'unresolvedSession') {
    notificationMessage = `${name} session is unresolved for the last ${alert.payload.notification_interval} min(s)`
  } else if (alert.payload.type === 'pendingSession') {
    notificationMessage = `${name} has been awaiting reply from agent for last ${alert.payload.notification_interval} min(s)`
  }
  if (alert.payload.platform === 'messenger') {
    sendMobileNotificationForMessenger(alert, users, notificationMessage, name)
  } else if (alert.payload.platform === 'whatsApp') {
    sendMobileNotificationForWhatsapp(alert, users, notificationMessage, name)
  } else if (alert.payload.platform === 'sms') {
    // Write to logic to send SMS Push Notification
  // The SMS Platform is Yet not implemented
    // sendMobileNotificationForSms(alert, users, notificationMessage, name)
  }
}

function sendMobileNotificationForMessenger (alert, users, notificationMessage, subscriberName) {
  let subscriber = alert.payload.subscriber
  let page = subscriber.pageId
  let title = '[' + page.pageName + ']: ' + subscriberName
  let newPayload = {
    action: alert.payload.type === 'unresolvedSession' ? 'chat_messenger_unresolvedSession' : 'chat_messenger_pendingSession',
    subscriber: subscriber
  }
  let lastMessageData = sessionLogicLayer.getQueryData('', 'aggregate', { company_id: page.companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
  utility.callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
    .then(gotLastMessage => {
      subscriber.lastPayload = gotLastMessage[0].payload
      subscriber.lastRepliedBy = gotLastMessage[0].replied_by
      subscriber.lastDateTime = gotLastMessage[0].datetime
      sendNotifications(title, notificationMessage, newPayload, users)
    }).catch(error => {
      const message = error || 'Failed to fetch chat messages'
      logger.serverLog(message, `${TAG}: exports.sendMobileNotificationForMessenger`, users, {}, 'error')
    })
}

function sendMobileNotificationForWhatsapp (alert, users, cb, notificationMessage, subscriberName) {
  let subscriber = alert.payload.subscriber
  let newPayload = {
    action: alert.payload.type === 'unresolvedSession' ? 'chat_whatsapp_unresolvedSession' : 'chat_whatsapp_pendingSession',
    subscriber: subscriber
  }
  let lastMessageData = whatsAppSessionLogicLayer.getQueryData('', 'aggregate', { companyId: subscriber.companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
  utility.callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
    .then(gotLastMessage => {
      subscriber.lastPayload = gotLastMessage[0].payload
      subscriber.lastRepliedBy = gotLastMessage[0].replied_by
      subscriber.lastDateTime = gotLastMessage[0].datetime
      sendNotifications(subscriberName, notificationMessage, newPayload, users)
    }).catch(error => {
      const message = error || 'Failed to fetch whatsapp chat messages'
      logger.serverLog(message, `${TAG}: exports.sendMobileNotificationForWhatsapp`, users, {}, 'error')
    })
}

function sendMobileNotificationForSms (alert, users, notificationMessage, subscriberName) {
  let subscriber = alert.payload.subscriber
  let newPayload = {
    action: alert.payload.type === 'unresolvedSession' ? 'chat_whatsapp_unresolvedSession' : 'chat_whatsapp_pendingSession',
    subscriber: subscriber
  }
  let lastMessageData = smsSessionLogicLayer.getQueryData('', 'aggregate', { companyId: subscriber.companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
  utility.callApi(`smsChat/query`, 'post', lastMessageData, 'kibochat')
    .then(gotLastMessage => {
      subscriber.lastPayload = gotLastMessage[0].payload
      subscriber.lastRepliedBy = gotLastMessage[0].replied_by
      subscriber.lastDateTime = gotLastMessage[0].datetime
      sendNotifications(subscriberName, notificationMessage, newPayload, users)
    }).catch(error => {
      const message = error || 'Failed to fetch whatsapp chat messages'
      logger.serverLog(message, `${TAG}: exports.sendMobileNotificationForWhatsapp`, users, {}, 'error')
    })
}

function generateAdminNotification (alert, user, cb) {
  // logger.serverLog(TAG, `inside generate admin notification`)
  var name = ''
  var notificationMessage = ''
  if (alert.payload.subscriber.firstName) {
    name = alert.payload.subscriber.firstName + ' ' + alert.payload.subscriber.lastName
  } else if (alert.payload.subscriber.name) {
    name = alert.payload.subscriber.name
  }
  if (alert.payload.type === 'unresolvedSession') {
    notificationMessage = `${name} session is unresolved for the last ${alert.payload.notification_interval} min(s)`
  } else if (alert.payload.type === 'pendingSession') {
    notificationMessage = `${name} has been awaiting reply from agent for last ${alert.payload.notification_interval} min(s)`
  }

  let notification = {
    companyId: user.companyId,
    type: alert.payload.type,
    message: notificationMessage,
    agentId: user.userId._id,
    subscriber: alert.payload.subscriber,
    category: {type: 'message_alert', id: alert.payload.subscriber._id},
    platform: alert.payload.platform
  }
  utility.callApi(`notifications`, 'post', notification, 'kibochat')
    .then(savedNotification => {
      utility.callApi(`permissions/query`, 'post', {companyId: user.companyId, userId: user.userId._id})
        .then(userPermission => {
          if (userPermission.length > 0) {
            userPermission = userPermission[0]
          }
          if (alert.payload.subscriber.pageId) {
            if (userPermission.muteNotifications && userPermission.muteNotifications.includes(alert.payload.subscriber.pageId._id)) {
              notification.muteNotification = true
            } else {
              notification.muteNotification = false
            }
          } else {
            notification.muteNotification = false
          }

          require('../config/socketio').sendMessageToClient({
            room_id: user.companyId,
            body: {
              action: 'new_notification',
              payload: notification
            }
          })
          cb()
        })
        .catch(err => {
          cb(err)
        })
    })
    .catch(err => cb(err))
}
