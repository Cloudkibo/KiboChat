const logger = require('../../components/logger')
const utility = require('../v1.1/utility')
const TAG = 'api/global/messageAlerts.js'

function pushUnresolveAlertInStack (company, subscriber, platform) {
  let query = {
    purpose: 'findOne',
    match: {companyId: company._id, platform: platform, type: 'unresolved_session'}
  }
  utility.callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(alert => {
      if (alert) {
        var unresolveSessionAlert = alert
        if (unresolveSessionAlert.enabled) {
          var payload = {
            type: 'unresolvedSession',
            notification_interval: unresolveSessionAlert.interval,
            unit: unresolveSessionAlert.intervalUnit,
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
                  })
                  .catch(err => {
                    const message = err || 'Unable to save session info in cronStack'
                    logger.serverLog(message, `${TAG}: exports.pushUnresolveAlertInStack`, {}, {company, subscriber, platform}, 'error')
                  })
              } else {
                const message = 'Unresolved Session info already in cronStack'
                logger.serverLog(message, `${TAG}: exports.pushUnresolveAlertInStack`, {}, {company, subscriber, platform}, 'debug')
              }
            })
            .catch(err => {
              const message = err || 'Unable to save session info in cronStack'
              logger.serverLog(message, `${TAG}: exports.pushUnresolveAlertInStack`, {}, {company, subscriber, platform}, 'error')
            })
        }
      }
    })
    .catch(error => {
      const message = error || 'Error while fetching message alert'
      logger.serverLog(message, `${TAG}: exports.pushUnresolveAlertInStack`, {}, {company, subscriber, platform}, 'error')
    })
}

function pushSessionPendingAlertInStack (company, subscriber, platform) {
  let query = {
    purpose: 'findOne',
    match: {companyId: company._id, platform: platform, type: 'unresolved_session'}
  }
  utility.callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(alert => {
      if (alert) {
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
            })
            .catch(err => {
              const message = err || 'Unable to push session info in cronStack'
              logger.serverLog(message, `${TAG}: exports.pushSessionPendingAlertInStack`, {}, {company, subscriber, platform}, 'error')
            })
        }
      }
    })
    .catch(error => {
      const message = error || 'Error while fetch message alert'
      logger.serverLog(message, `${TAG}: exports.pushSessionPendingAlertInStack`, {}, {company, subscriber, platform}, 'error')
    })
}

function deleteUnresolvedSessionFromStack (subscriberId) {
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
    })
    .catch(err => {
      const message = err || 'Error while deleting unresolve session alert from cronStack'
      logger.serverLog(message, `${TAG}: exports.deleteUnresolvedSessionFromStack`, {}, {deleteData}, 'error')
    })
}

function deletePendingSessionFromStack (subscriberId) {
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
    })
    .catch(err => {
      const message = err || 'Error while deleting pending session alert from cronStack'
      logger.serverLog(message, `${TAG}: exports.deletePendingSessionFromStack`, {}, {deleteData}, 'error')
    })
}

exports.pushUnresolveAlertInStack = pushUnresolveAlertInStack
exports.pushSessionPendingAlertInStack = pushSessionPendingAlertInStack
exports.deleteUnresolvedSessionFromStack = deleteUnresolvedSessionFromStack
exports.deletePendingSessionFromStack = deletePendingSessionFromStack
