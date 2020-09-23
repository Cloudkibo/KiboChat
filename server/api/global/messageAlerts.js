const logger = require('../../components/logger')
const utility = require('../v1.1/utility')
const TAG = 'api/global/messageAlerts.js'

function pushUnresolveAlertInStack (company, subscriber, platform) {
  utility.callApi(`companypreferences/query`, 'post', {companyId: company._id}, 'accounts')
    .then(companypreferences => {
      if (companypreferences.length > 0) {
        var unresolveSessionAlert = companypreferences[0].unresolveSessionAlert
        if (unresolveSessionAlert.enabled) {
          var payload = {
            type: 'unresolvedSession',
            notification_interval: unresolveSessionAlert.notification_interval,
            unit: unresolveSessionAlert.unit,
            assignedMembers: unresolveSessionAlert.assignedMembers,
            subscriber: subscriber,
            companyId: company._id,
            platform: platform
          }
          var record = {
            type: 'adminAlert',
            payload: payload
          }
          var findSession = {
            purpose: 'findAll',
            match: {
              type: 'adminAlert',
              'payload.type': 'unresolvedSession',
              'payload.subscriber._id': subscriber._id
            }
          }
          utility.callApi(`cronStack/query`, 'post', findSession, 'kibochat')
            .then(result => {
              if (result.length < 1) {
                utility.callApi(`cronStack`, 'post', record, 'kibochat')
                  .then(savedRecord => {
                    logger.serverLog(TAG, `Unresolved Session info pushed in cronStack ${savedRecord}`)
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Unable to save session info in cronStack ${err}`, 'error')
                  })
              } else {
                logger.serverLog(TAG, `Unresolved Session info already in cronStack`)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Unable to find session info in cron stack ${err}`, 'error')
            })
        }
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Error while fetching company preferences ${error}`, 'error')
    })
}

function pushSessionPendingAlertInStack (company, subscriber, platform) {
  logger.serverLog(TAG, 'In Pending Session Info')
  utility.callApi(`companypreferences/query`, 'post', {companyId: company._id}, 'accounts')
    .then(companypreferences => {
      if (companypreferences.length > 0) {
        var pendingSessionAlert = companypreferences[0].pendingSessionAlert
        if (pendingSessionAlert.enabled) {
          var payload = {
            type: 'pendingSession',
            notification_interval: pendingSessionAlert.notification_interval,
            unit: pendingSessionAlert.unit,
            assignedMembers: pendingSessionAlert.assignedMembers,
            subscriber: subscriber,
            companyId: company._id,
            platform: platform
          }
          var record = {
            type: 'adminAlert',
            payload: payload
          }
          utility.callApi(`cronStack`, 'post', record, 'kibochat')
            .then(savedRecord => {
              logger.serverLog(TAG, `Pending Session info pushed in cronStack ${savedRecord}`)
            })
            .catch(err => {
              logger.serverLog(TAG, `Unable to push session info in cron stack ${err}`, 'error')
            })
        }
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Error while fetching company preferences ${error}`, 'error')
    })
}

function deleteUnresolvedSessionFromStack (subscriberId) {
  console.log('Inside delete unresolved session', subscriberId)
  var deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': 'unresolvedSession',
      'payload.subscriber._id': subscriberId
    }
  }
  utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
    .then(updatedRecord => {
      logger.serverLog('Unresolved session info deleted successfully from cronStack')
    })
    .catch(err => {
      logger.serverLog(`Error while deleting unresolve session alert from cronStack ${err}`)
    })
}

function deletePendingSessionFromStack (subscriberId) {
  console.log('Inside delete unresolved session', subscriberId)
  var deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': 'pendingSession',
      'payload.subscriber._id': subscriberId
    }
  }
  utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
    .then(updatedRecord => {
      logger.serverLog('Pending session info deleted successfully from cronStack')
    })
    .catch(err => {
      logger.serverLog(`Error while deleting pending session alert from cronStack ${err}`)
    })
}

exports.pushUnresolveAlertInStack = pushUnresolveAlertInStack
exports.pushSessionPendingAlertInStack = pushSessionPendingAlertInStack
exports.deleteUnresolvedSessionFromStack = deleteUnresolvedSessionFromStack
exports.deletePendingSessionFromStack = deletePendingSessionFromStack
