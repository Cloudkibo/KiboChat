const logger = require('../../components/logger')
const TAG = 'scripts/slaDashboard.js'
const { callApi } = require('../../api/v1.1/utility')
const { _getResponsesData } = require('./utilities')

exports.pushDayWiseRecordsToSDAPage = function (last24) {
  const newSessionsCriteria = [
    {$match: {datetime: {$gt: last24}}},
    {$group: {_id: '$pageId', companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const openSessionsCriteria = [
    {$match: {openedAt: {$gt: last24}, status: 'new'}},
    {$group: {_id: '$pageId', companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const closedSessionsCriteria = [
    {$match: {resolvedAt: {$gt: last24}, status: 'resolved'}},
    {$group: {_id: '$pageId', companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const pendingSessionsCriteria = [
    {$match: {pendingAt: {$gt: last24}}},
    {$group: {_id: '$pageId', companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const messagesSentCriteria = [
    {$match: {datetime: {$gt: last24}, format: 'convos'}},
    {$group: {_id: '$sender_id', companyId: {$first: '$company_id'}, count: {$sum: 1}}}
  ]
  const messagesReceivedCriteria = [
    {$match: {datetime: {$gt: last24}, format: 'facebook'}},
    {$group: {_id: '$recipient_id', companyId: {$first: '$company_id'}, count: {$sum: 1}}}
  ]
  const avgResolvedTimeCriteria = [
    {$match: {resolvedAt: {$gt: last24}, status: 'resolved'}},
    {$project: {pageId: 1, diff: {$subtract: ['$resolvedAt', '$openedAt']}}},
    {$group: {_id: '$pageId', average: {$avg: '$diff'}}}
  ]

  const newSessionsPromise = callApi('subscribers/aggregate', 'post', newSessionsCriteria)
  const openSessionsPromise = callApi('subscribers/aggregate', 'post', openSessionsCriteria)
  const closedSessionsPromise = callApi('subscribers/aggregate', 'post', closedSessionsCriteria)
  const pendingSessionsPromise = callApi('subscribers/aggregate', 'post', pendingSessionsCriteria)
  const messagesSentPromise = callApi('livechat/aggregate', 'post', messagesSentCriteria, 'kibochat')
  const messagesReceivedPromise = callApi('livechat/aggregate', 'post', messagesReceivedCriteria, 'kibochat')
  const avgResolvedTimePromise = callApi('subscribers/aggregate', 'post', avgResolvedTimeCriteria)

  Promise.all([
    newSessionsPromise,
    openSessionsPromise,
    closedSessionsPromise,
    pendingSessionsPromise,
    messagesSentPromise,
    messagesReceivedPromise,
    avgResolvedTimePromise
  ])
    .then(async (results) => {
      const newSessions = results[0]
      const openSessions = results[1]
      const closedSessions = results[2]
      const pendingSessions = results[3]
      const messagesSent = results[4]
      const messagesReceived = results[5]
      const avgResolvedTime = results[6]
      const pageData = await _getUniquePageIds([...newSessions, ...openSessions, ...closedSessions, ...pendingSessions, ...messagesSent, ...messagesReceived])
      let SDAPageWiseData = []
      for (let i = 0; i < pageData.length; i++) {
        const responsesData = await _getResponsesData(pageData[i].pageId, last24)
        SDAPageWiseData.push({
          companyId: pageData[i].companyId,
          pageId: pageData[i].pageId,
          session: await _getSessionsCount(pageData[i].pageId, newSessions, openSessions, closedSessions, pendingSessions),
          messages: await _getMessagesCount(pageData[i].pageId, messagesSent, messagesReceived),
          avgResolveTime: await _getAverageResolveTime(pageData[i].pageId, avgResolvedTime),
          maxRespTime: responsesData.maxRespTime,
          avgRespTime: responsesData.avgRespTime,
          responses: responsesData.responsesData
        })
        callApi('slaDashboard/pageWise', 'post', SDAPageWiseData, 'kibodash')
          .then(saved => {})
          .catch(err => {
            const message = err || 'Error at storing SDAPageWise data'
            logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDAPage`, {}, {SDAPageWiseData}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Error at finding SDAPageWise data'
      logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDAPage`, {}, {last24}, 'error')
    })
}

const _getUniquePageIds = (array) => {
  let pageData = array.filter((p, i, a) => a.findIndex((v) => v.pageId === p.pageId) === i)
  return pageData
}

const _getSessionsCount = (pageId, newSessions, openSessions, closedSessions, pendingSessions) => {
  const criteria = (s) => s._id === pageId
  newSessions = newSessions.find(criteria)
  pendingSessions = pendingSessions.find(criteria)
  openSessions = openSessions.find(criteria)
  closedSessions = closedSessions.find(criteria)
  return {
    new: newSessions ? newSessions.count : 0,
    pending: pendingSessions ? pendingSessions.count : 0,
    open: openSessions ? openSessions.count : 0,
    resolved: closedSessions ? closedSessions.count : 0
  }
}

const _getMessagesCount = (pageId, messagesSent, messagesReceived) => {
  messagesSent = messagesSent.find((m) => m._id === pageId)
  messagesReceived = messagesReceived.find((m) => m._id === pageId)
  return {
    sent: messagesSent ? messagesSent.count : 0,
    received: messagesReceived ? messagesReceived.count : 0
  }
}

const _getAverageResolveTime = (pageId, avgResolvedTime) => {
  avgResolvedTime = avgResolvedTime.find((a) => a._id === pageId)
  const average = avgResolvedTime ? avgResolvedTime.average : undefined
  return average
}
