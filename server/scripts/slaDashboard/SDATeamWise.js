const logger = require('../../components/logger')
const TAG = 'scripts/slaDashboard.js'
const { callApi } = require('../../api/v1.1/utility')
const { _getResponsesData } = require('./utilities')

exports.pushDayWiseRecordsToSDATeam = function (last24) {
  const newSessionsCriteria = [
    {$match: {assignedAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team'}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const openSessionsCriteria = [
    {$match: {openedAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team', status: 'new'}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const closedSessionsCriteria = [
    {$match: {resolvedAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team', status: 'resolved'}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const pendingSessionsCriteria = [
    {$match: {pendingAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team'}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, companyId: {$first: '$companyId'}, count: {$sum: 1}}}
  ]
  const messagesSentCriteria = [
    {$match: {datetime: {$gt: last24}, format: 'convos', replied_by: {$exists: true}}},
    {$group: {_id: {pageId: '$sender_id', teamId: '$replied_by.id'}, companyId: {$first: '$company_id'}, count: {$sum: 1}}}
  ]
  const avgResolvedTimeCriteria = [
    {$match: {resolvedAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team', status: 'resolved'}},
    {$project: {pageId: 1, diff: {$subtract: ['$resolvedAt', '$openedAt']}}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, average: {$avg: '$diff'}}}
  ]

  const newSessionsPromise = callApi('subscribers/aggregate', 'post', newSessionsCriteria)
  const openSessionsPromise = callApi('subscribers/aggregate', 'post', openSessionsCriteria)
  const closedSessionsPromise = callApi('subscribers/aggregate', 'post', closedSessionsCriteria)
  const pendingSessionsPromise = callApi('subscribers/aggregate', 'post', pendingSessionsCriteria)
  const messagesSentPromise = callApi('livechat/aggregate', 'post', messagesSentCriteria, 'kibochat')
  const avgResolvedTimePromise = callApi('subscribers/aggregate', 'post', avgResolvedTimeCriteria)

  Promise.all([
    newSessionsPromise,
    openSessionsPromise,
    closedSessionsPromise,
    pendingSessionsPromise,
    messagesSentPromise,
    avgResolvedTimePromise
  ])
    .then(async (results) => {
      const newSessions = results[0]
      const openSessions = results[1]
      const closedSessions = results[2]
      const pendingSessions = results[3]
      const messagesSent = results[4]
      const avgResolvedTime = results[5]
      const teamsData = await _getUniqueRecords([...newSessions, ...openSessions, ...closedSessions, ...pendingSessions, ...messagesSent])
      let SDAUserWiseData = []
      for (let i = 0; i < teamsData.length; i++) {
        const responsesData = await _getResponsesData(teamsData[i]._id.pageId, last24)
        SDAUserWiseData.push({
          companyId: teamsData[i].companyId,
          pageId: teamsData[i]._id.pageId,
          teamId: teamsData[i]._id.teamId,
          session: await _getSessionsCount(teamsData[i]._id, newSessions, openSessions, closedSessions, pendingSessions),
          messages: await _getMessagesCount(teamsData[i]._id, messagesSent),
          avgResolveTime: await _getAverageResolveTime(teamsData[i]._id, avgResolvedTime),
          maxRespTime: responsesData.maxRespTime,
          avgRespTime: responsesData.avgRespTime,
          responses: responsesData.responsesData
        })
        callApi('slaDashboard/pageWise', 'post', SDAUserWiseData, 'kibodash')
          .then(saved => {})
          .catch(err => {
            const message = err || 'Error at storing SDAPageWise data'
            logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDAPage`, {}, {SDAUserWiseData}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Error at finding SDAPageWise data'
      logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDAPage`, {}, {last24}, 'error')
    })
}

const _getUniqueRecords = (array) => {
  let uniqueRecords = array.filter(
    (p, i, a) => a.findIndex((v) => v._id.pageId === p._id.pageId && v._id.teamId === p._id.teamId) === i
  )
  return uniqueRecords
}

const _getSessionsCount = (data, newSessions, openSessions, closedSessions, pendingSessions) => {
  const criteria = (s) => s._id.pageId === data.pageId && s._id.teamId === data.teamId
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

const _getMessagesCount = (data, messagesSent) => {
  messagesSent = messagesSent.find((m) => m._id.pageId === data.pageId && m._id.teamId === data.teamId)
  return {
    sent: messagesSent ? messagesSent.count : 0
  }
}

const _getAverageResolveTime = (data, avgResolvedTime) => {
  avgResolvedTime = avgResolvedTime.find((a) => a._id.pageId === data.pageId && a._id.teamId === data.teamId)
  const average = avgResolvedTime ? avgResolvedTime.average : undefined
  return average
}
