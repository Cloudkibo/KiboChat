const logger = require('../../components/logger')
const TAG = 'scripts/slaDashboard.js'
const { callApi } = require('../../api/v1.1/utility')
const { _getResponsesData } = require('./utilities')
const async = require('async')

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
  const avgResolvedTimeCriteria = [
    {$match: {resolvedAt: {$gt: last24}, is_assigned: true, 'assigned_to.type': 'team', status: 'resolved'}},
    {$project: {pageId: 1, diff: {$subtract: ['$resolvedAt', '$openedAt']}}},
    {$group: {_id: {teamId: '$assigned_to.id', pageId: '$pageId'}, average: {$avg: '$diff'}}}
  ]

  const newSessionsPromise = callApi('subscribers/aggregate', 'post', newSessionsCriteria)
  const openSessionsPromise = callApi('subscribers/aggregate', 'post', openSessionsCriteria)
  const closedSessionsPromise = callApi('subscribers/aggregate', 'post', closedSessionsCriteria)
  const pendingSessionsPromise = callApi('subscribers/aggregate', 'post', pendingSessionsCriteria)
  const messagesSentPromise = _getMessagesSentCount(last24)
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
      try {
        const newSessions = results[0]
        const openSessions = results[1]
        const closedSessions = results[2]
        const pendingSessions = results[3]
        const messagesSent = results[4]
        const avgResolvedTime = results[5]
        const teamsData = await _getUniqueRecords([...newSessions, ...openSessions, ...closedSessions, ...pendingSessions, ...messagesSent])
        for (let i = 0; i < teamsData.length; i++) {
          const responsesData = await _getResponsesData(teamsData[i]._id.pageId, last24, 'team', teamsData[i]._id.teamId)
          const data = JSON.parse(JSON.stringify({
            companyId: teamsData[i].companyId,
            pageId: teamsData[i]._id.pageId,
            teamId: teamsData[i]._id.teamId,
            sessions: await _getSessionsCount(teamsData[i]._id, newSessions, openSessions, closedSessions, pendingSessions),
            messages: await _getMessagesCount(teamsData[i]._id, messagesSent),
            avgResolveTime: await _getAverageResolveTime(teamsData[i]._id, avgResolvedTime),
            maxRespTime: responsesData.maxRespTime,
            avgRespTime: responsesData.avgRespTime,
            responses: responsesData.responses
          }))
          console.log(data)
          callApi('slaDashboard/teamWise', 'post', data, 'kibodash')
            .then(saved => {})
            .catch(err => {
              const message = err || 'Error at storing SDATeamWise data'
              logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDATeam`, {}, {data}, 'error')
            })
        }
      } catch (err) {
        const message = err || 'Error at SDATeamWise script'
        logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDATeam`, {}, {}, 'error')
      }
    })
    .catch(err => {
      const message = err || 'Error at finding SDATeamWise data'
      logger.serverLog(message, `${TAG}: exports.pushDayWiseRecordsToSDATeam`, {}, {last24}, 'error')
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

const _getMessagesSentCount = (last24) => {
  return new Promise((resolve, reject) => {
    let sentData = []
    const messagesSentCriteria = [
      {$match: {datetime: {$gt: last24}, format: 'convos', replied_by: {$exists: true}}},
      {$group: {_id: '$subscriber_id', count: {$sum: 1}}}
    ]
    callApi('livechat/aggregate', 'post', messagesSentCriteria, 'kibochat')
      .then(records => {
        const subIds = records.map((item) => item._id)
        const criteria = [
          {$match: {_id: {$in: subIds}, 'assigned_to.type': 'team', is_assigned: true}},
          {$group: {_id: {pageId: '$pageId', teamId: '$assigned_to.id'}, subscribers: {$push: '$$ROOT'}}}
        ]
        callApi('subscribers/aggregate', 'post', criteria)
          .then(results => {
            if (results.length > 0) {
              async.each(results, function (item, cb) {
                const ids = item.subscribers.map((s) => s._id)
                const filtered = records.filter((r) => ids.includes(r._id))
                const count = filtered.reduce((a, b) => a + b['count'], 0)
                sentData.push({
                  _id: {
                    pageId: item._id.pageId,
                    teamId: item._id.teamId
                  },
                  companyId: item.subscribers[0].companyId,
                  count
                })
                cb()
              }, function (err) {
                if (err) {
                  reject(err)
                } else {
                  resolve(sentData)
                }
              })
            } else {
              resolve(sentData)
            }
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}
