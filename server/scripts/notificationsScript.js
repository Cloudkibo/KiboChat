const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')

exports.runLiveChatNotificationScript = function () {
    logger.serverLog(TAG, 'runLiveChatNotificationScript')
    var findAdminAlerts = {
        purpose: 'findAll',
        match: {
            type: 'adminAlert'
        }
    }
    utility.callApi(`cronStack/query`, 'post', findAdminAlerts, 'kibochat')
    .then(alerts => {
        logger.serverLog(TAG, `alerts ${JSON.stringify(alerts)} ${JSON.stringify(alerts.length)}`)
        if (alerts.length > 0) {
            async.each(alerts, function (alert, cb) {
                logger.serverLog(TAG, `alert ${alert}`)
                if (alert.payload && alert.payload.notification_interval) {
                    var now = moment(new Date())
                    var sessionTime = moment(alert.datetime)
                    var duration = moment.duration(now.diff(sessionTime))
                    logger.serverLog(TAG, `duration ${duration.asMinutes()}`)
                    logger.serverLog(TAG, `notification_interval ${alert.payload.notification_interval}`)
                    if (duration.asMinutes() > alert.payload.notification_interval) {
                        logger.serverLog(TAG, `duration passed ${duration}`)
                        utility.callApi(`companyUser/queryAll`, 'post', {companyId: alert.payload.companyId}, 'accounts')
                        .then(companyUsers => {
                            let assignedMembers
                            logger.serverLog(TAG, `companyUsers ${JSON.stringify(companyUsers)}`)
                            if (alert.payload.assignedMembers == 'buyer') {
                                assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role === 'buyer')
                            } else if (alert.payload.assignedMembers == 'admins') {
                                assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role === 'admin')
                            } else {
                                assignedMembers = companyUsers.filter((companyUser) => companyUser.userId.role !== 'agent')
                            }
                            logger.serverLog(TAG, `assignedMembers ${JSON.stringify(assignedMembers)}`)
                            async.each(assignedMembers, function(assignedMember, callback) {
                                if (alert.payload.type === 'unresolvedSession') {
                                    generateUnresolvedSessionNotification(alert, assignedMember, callback)
                                }
                                if (alert.payload.type === 'pendingSession') {
                                    generatePendingSessionNotification(alert, assignedMember, callback)
                                }
                            }, function(err) {
                                if (err) {
                                    cb(err)
                                }
                                cb()
                            })
                        })
                        .catch(err => {
                            logger.serverLog(TAG, 'Unable to fetch company users')
                            cb(err)
                        })
                    }
                }
            }, function (err) {
                if (err) {
                  logger.serverLog(TAG, `Unable to generate admin alerts ${err}`, 'error')
                } else {
                  logger.serverLog(TAG, 'Admin alerts generated')
                }
              })
        }
    })
    .catch(err => {
        logger.serverlog('TAG', 'Unable to fetch cronstach')
    })
}

function generatePendingSessionNotification (alert, user, cb){
    logger.serverLog(TAG, `inside generate pending session`)
    var name = alert.payload.subscriber.name
    let notification = {
        companyId: user.companyId,
        message: `${name} has been awaiting reply from agent for last ${alert.payload.notification_interval} mins`,
        agentId: user.userId._id,
        category: {type: 'chat_session' , id:alert.payload.subscriber._id}
      }
      utility.callApi(`notifications`, 'post', notification, 'kibochat')
      .then(savedNotification => {
        var deleteData = {
            purpose: 'deleteMany',
            match: {
              type: 'adminAlert',
              'payload.type': 'pendingSession', 
              'payload.subscriber._id': alert.payload.subscriber._id
            }
          }
          utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
          .then(updatedRecord => {     
            logger.serverLog('Pending session info deleted successfully from cronStack')
            require('../config/socketio').sendMessageToClient({
                room_id: companyId,
                body: {
                  action: 'new_notification',
                  payload: notification
                }
              })
              cb()
          })
          .catch(err => {
            cb(err)
            logger.serverLog(`Error while deleting unresolve session alert from cronStack ${err}`)
          })
        })
      .catch(err => cb(err))
}

function generateUnresolvedSessionNotification (alert, user, cb){
    logger.serverLog(TAG, `inside generate unresolved session`)
    var name = alert.payload.subscriber.name
    let notification = {
        companyId: user.companyId,
        message: `${name} session is unresolved for the last ${alert.payload.notification_interval} mins`,
        agentId: user.userId._id,
        category: {type: 'chat_session', id:alert.payload.subscriber._id}
      }
      utility.callApi(`notifications`, 'post', notification, 'kibochat')
      .then(savedNotification => {
        var deleteData = {
            purpose: 'deleteMany',
            match: {
              type: 'adminAlert',
              'payload.type': 'unresolvedSession', 
              'payload.subscriber._id': alert.payload.subscriber._id
            }
          }
          utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
          .then(updatedRecord => {     
            logger.serverLog('Unresolved session info deleted successfully from cronStack')
            require('../config/socketio').sendMessageToClient({
                room_id: companyId,
                body: {
                  action: 'new_notification',
                  payload: notification
                }
              })
              cb()
          })
          .catch(err => {
              cb(err)
            logger.serverLog(`Error while deleting unresolve session alert from cronStack ${err}`)
          })
      })
      .catch(err => cb(err))
}
