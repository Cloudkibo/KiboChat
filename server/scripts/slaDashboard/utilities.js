const { callApi } = require('../../api/v1.1/utility')
const async = require('async')

exports._getResponsesData = (pageId, last24, type, id, companyId) => {
  return new Promise((resolve, reject) => {
    _getCriteria(pageId, last24, type, id, companyId)
      .then(criteria => {
        if (criteria !== 'NO_RECORDS') {
          callApi('livechat/aggregate', 'post', criteria, 'kibochat')
            .then(async (subscribers) => {
              if (subscribers.length > 0) {
                let totalRespTime = 0
                let responses = 0
                let sessions = 0
                let maxRespTime = 0
                async.each(subscribers, function (subscriber, cb) {
                  let agentReplies = subscriber.messages.filter((msg) => msg.format === 'convos')
                  if (agentReplies.length > 0) {
                    _calculateResponsesData(subscriber)
                      .then(subRespData => {
                        totalRespTime = totalRespTime + subRespData.avgRespTime
                        responses = responses + subRespData.responses
                        maxRespTime = maxRespTime < subRespData.maxRespTime ? subRespData.maxRespTime : maxRespTime
                        sessions++
                        cb()
                      })
                      .catch(err => {
                        cb(err)
                      })
                  }
                }, function (err) {
                  if (err) {
                    reject(err)
                  } else {
                    resolve({
                      avgRespTime: totalRespTime > 0 ? parseInt(totalRespTime / sessions) : undefined,
                      responses: responses > 0 ? responses : undefined,
                      maxRespTime: maxRespTime > 0 ? maxRespTime : undefined
                    })
                  }
                })
              } else {
                resolve({})
              }
            })
            .catch(err => {
              reject(err)
            })
        } else {
          resolve({})
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

const _calculateResponsesData = (subscriber) => {
  return new Promise((resolve, reject) => {
    const messages = subscriber.messages
    let index = 0
    let maxRespTime = 0
    let responses = 0
    let avgRespTime = 0
    async.series([function (cb) {
      const fmd = messages[0] // first message of the day
      if (fmd.format === 'convos') {
        let lastMsgCriteria = [
          {$match: {_id: {$lt: fmd._id}, subscriber_id: subscriber._id}},
          {$sort: {_id: -1}},
          {$limit: 1}
        ]
        callApi('livechat/aggregate', 'post', lastMsgCriteria, 'kibochat')
          .then(lastMsg => {
            if (lastMsg.length > 0) {
              const lmpd = lastMsg[0] // last message of previous day
              if (lmpd && lmpd.format === 'facebook') {
                responses++
                let diff = new Date(fmd.datetime) - new Date(lmpd.datetime)
                avgRespTime = (diff + avgRespTime) / responses
                if (maxRespTime < diff) {
                  maxRespTime = diff
                }
              }
            }
            index = 1
            cb()
          })
          .catch(err => {
            cb(err)
          })
      } else {
        cb()
      }
    }, function (cb) {
      let run = true
      do {
        let message = messages[index]
        if (message.format === 'facebook') {
          let nextMessage = messages.find((m, i) => i > index && m.format === 'convos')
          if (nextMessage) {
            responses++
            let diff = new Date(nextMessage.datetime) - new Date(message.datetime)
            avgRespTime = (diff + avgRespTime) / responses
            if (maxRespTime < diff) {
              maxRespTime = diff
            }
            index = messages.findIndex((m) => m._id === nextMessage._id) + 1
          } else {
            run = false
          }
        } else {
          index++
        }
        if (!(run && index < messages.length)) cb()
      } while (run && index < messages.length)
    }], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({
          avgRespTime,
          responses,
          maxRespTime
        })
      }
    })
  })
}

const _getCriteria = (pageId, last24, type, id, companyId) => {
  return new Promise((resolve, reject) => {
    let criteria = [
      {$match: {datetime: {$gt: last24}, $or: [{sender_id: pageId}, {recipient_id: pageId}]}},
      {$group: {_id: '$subscriber_id', messages: {$push: '$$ROOT'}}}
    ]
    if (['user', 'team'].includes(type)) {
      const subsCriteria = {is_assigned: true, 'assigned_to.id': id, companyId}
      callApi('subscribers/query', 'post', subsCriteria)
        .then(subscribers => {
          if (subscribers.length > 0) {
            const ids = subscribers.map((s) => s._id)
            criteria[0]['$match'] = {datetime: {$gt: last24}, subscriber_id: {$in: ids}}
            resolve(criteria)
          } else {
            resolve('NO_RECORDS')
          }
        })
        .catch(err => {
          reject(err)
        })
    } else {
      resolve(criteria)
    }
  })
}
