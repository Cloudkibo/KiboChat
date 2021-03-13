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
        if (alert.enabled) {
          let findSession = {
            purpose: 'findOne',
            match: {
              type: 'adminAlert',
              'payload.type': 'unresolved_session',
              'payload.subscriber._id': subscriber._id
            }
          }
          utility.callApi(`cronStack/query`, 'post', findSession, 'kibochat')
            .then(result => {
              if (!result) {
                let record = preparePayload(subscriber, company, platform, 'unresolved_session')
                utility.callApi(`cronStack`, 'post', record, 'kibochat')
                  .then(savedRecord => {
                  })
                  .catch(err => {
                    const message = err || 'Unable to save session info in cronStack'
                    logger.serverLog(message, `${TAG}: exports.pushUnresolveAlertInStack`, {}, {company, subscriber, platform}, 'error')
                  })
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
    match: {companyId: company._id, platform: platform, type: 'pending_session'}
  }
  utility.callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(alert => {
      if (alert) {
        if (alert.enabled) {
          let record = preparePayload(subscriber, company, platform, 'pending_session')
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
  let deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': 'unresolved_session',
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
  let deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': 'pending_session',
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

function pushTalkToAgentAlertInStack (company, subscriber, platform, chatbotName) {
  let query = {
    purpose: 'findOne',
    match: {companyId: company._id, platform: platform, type: 'talk_to_agent'}
  }
  utility.callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(alert => {
      if (alert) {
        if (alert.enabled) {
          let findSession = {
            purpose: 'findOne',
            match: {
              type: 'adminAlert',
              'payload.type': 'talk_to_agent',
              'payload.subscriber._id': subscriber._id
            }
          }
          utility.callApi(`cronStack/query`, 'post', findSession, 'kibochat')
            .then(result => {
              if (!result) {
                let record = preparePayload(subscriber, company, platform, 'talk_to_agent', chatbotName)
                utility.callApi(`cronStack`, 'post', record, 'kibochat')
                  .then(savedRecord => {
                  })
                  .catch(err => {
                    const message = err || 'Unable to push session info in cronStack'
                    logger.serverLog(message, `${TAG}: exports.pushTalkToAgentAlertInStack`, {}, {company, subscriber, platform}, 'error')
                  })
              }
            })
            .catch(err => {
              const message = err || 'Unable to fetch session'
              logger.serverLog(message, `${TAG}: exports.pushTalkToAgentAlertInStack`, {}, {company, subscriber, platform}, 'error')
            })
        }
      }
    })
    .catch(error => {
      const message = error || 'Error while fetch message alert'
      logger.serverLog(message, `${TAG}: exports.pushTalkToAgentAlertInStack`, {}, {company, subscriber, platform}, 'error')
    })
}

function preparePayload (subscriber, company, platform, type, chatbotName) {
  let data = {
    type: 'adminAlert',
    payload: {
      type: type,
      subscriber: {
        _id: subscriber._id,
        name: subscriber.name ? subscriber.name : subscriber.firstName + ' ' + subscriber.lastName,
        senderId: subscriber.senderId ? subscriber.senderId : subscriber.number
      },
      chatbotName: chatbotName,
      companyId: company._id,
      platform: platform
    }
  }
  if (subscriber.pageId && typeof subscriber.pageId === 'object') {
    data.payload.page = {
      _id: subscriber.pageId._id,
      accessToken: subscriber.pageId.accessToken,
      pageId: subscriber.pageId.pageId
    }
  }
  return data
}

exports.pushUnresolveAlertInStack = pushUnresolveAlertInStack
exports.pushSessionPendingAlertInStack = pushSessionPendingAlertInStack
exports.deleteUnresolvedSessionFromStack = deleteUnresolvedSessionFromStack
exports.deletePendingSessionFromStack = deletePendingSessionFromStack
exports.pushTalkToAgentAlertInStack = pushTalkToAgentAlertInStack
