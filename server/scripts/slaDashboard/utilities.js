const logger = require('../../components/logger')
const TAG = 'scripts/slaDashboard.js'
const { callApi } = require('../../api/v1.1/utility')

exports._getResponsesData = (pageId, last24) => {
  console.log('_getResponsesData called')
  const criteria = [
    {$match: {datetime: {$gt: last24}, $or: [{sender_id: pageId}, {recipient_id: pageId}]}},
    {$group: {_id: '$subscriber_id', messages: {$push: '$$ROOT'}}}
  ]
  return callApi('livechat/aggregate', 'post', criteria, 'kibochat')
    .then(async (subscribers) => {
      console.log('subscribers', subscribers)
      if (subscribers.length > 0) {
        let totalRespTime = 0
        let maxRespTime = 0
        let responses = 0
        let sessions = 0
        for (let i = 0; i < subscribers.length; i++) {
          let subRespData = {
            avgRespTime: 0,
            responses: 0
          }
          let subRespTime = await _calculateMaxResponseTime(subscribers[i], subscribers[i].messages, 0, 0)
          if (subRespTime > maxRespTime) maxRespTime = subRespTime

          let agentReplies = subscribers[i].messages.filter((msg) => msg.format === 'convos')
          if (agentReplies.length > 0) {
            subRespData = await _calculateAvgResponseTime(subscribers[i], subscribers[i].messages, agentReplies, 0, 0, 0)
            sessions++
          }
          totalRespTime = totalRespTime + subRespData.avgRespTime
          responses = responses + subRespData.responses
        }
        return {
          avgRespTime: totalRespTime > 0 ? totalRespTime / sessions : undefined,
          responses: responses > 0 ? responses : undefined,
          maxRespTime: maxRespTime > 0 ? maxRespTime : undefined
        }
      } else {
        return {}
      }
    })
    .catch(err => {
      const message = err || 'Error at getting page messages'
      logger.serverLog(message, `${TAG}: exports._getResponsesData`, {}, {pageId, last24}, 'error')
    })
}

const _calculateMaxResponseTime = (subscriber, messages, index, maxRespTime) => {
  if (index === messages.length) {
    return maxRespTime
  } else {
    let message = messages[index]
    let lastMsgCriteria = [
      {$match: {_id: {$lt: message._id}, subscriber_id: subscriber._id}},
      {$sort: {_id: -1}},
      {$limit: 1}
    ]
    return callApi('livechat/aggregate', 'post', lastMsgCriteria, 'kibochat')
      .then(lastMsg => {
        if (lastMsg && lastMsg.format === 'facebook') {
          lastMsgCriteria['$match'].format = 'convos'
          callApi('subscribers/aggregate', 'post', lastMsgCriteria)
            .then(firstMsg => {
              if (firstMsg) {
                let criteria = [
                  {$match: {$and: [
                    {_id: {$lt: lastMsg._id}},
                    {_id: {$gt: firstMsg._id}}
                  ]}}
                ]
                callApi('livechat/aggregate', 'post', criteria, 'kibochat')
                  .then(subscriberMsgs => {
                    if (subscriberMsgs.length > 0) {
                      let diff = new Date(lastMsg.datetime) - new Date(subscriberMsgs[0].datetime)
                      if (!maxRespTime || maxRespTime < diff) {
                        maxRespTime = diff
                        return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                      } else {
                        return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                      }
                    } else {
                      return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                    }
                  })
                  .catch(err => {
                    const message = err || 'Error at finding subscriber messages'
                    logger.serverLog(message, `${TAG}: exports._calculateMaxResponseTime`, {}, {subscriber, message}, 'error')
                    return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                  })
              } else {
                let criteria = [{$match: {_id: {$lt: lastMsg._id}}}]
                callApi('livechat/aggregate', 'post', criteria, 'kibochat')
                  .then(subscriberMsgs => {
                    if (subscriberMsgs.length > 0) {
                      let diff = new Date(lastMsg.datetime) - new Date(subscriberMsgs[0].datetime)
                      if (!maxRespTime || maxRespTime < diff) {
                        maxRespTime = diff
                        return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                      } else {
                        return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                      }
                    } else {
                      return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                    }
                  })
                  .catch(err => {
                    const message = err || 'Error at finding subscriber messages'
                    logger.serverLog(message, `${TAG}: exports._calculateMaxResponseTime`, {}, {subscriber, message}, 'error')
                    return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
                  })
              }
            })
            .catch(err => {
              const message = err || 'Error at finding first message'
              logger.serverLog(message, `${TAG}: exports._calculateMaxResponseTime`, {}, {subscriber, message}, 'error')
              return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
            })
        } else {
          return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
        }
      })
      .catch(err => {
        const message = err || 'Error at finding last message'
        logger.serverLog(message, `${TAG}: exports._calculateMaxResponseTime`, {}, {subscriber, message}, 'error')
        return _calculateMaxResponseTime(subscriber, messages, index + 1, maxRespTime)
      })
  }
}

const _calculateAvgResponseTime = async (subscriber, messages, agentReplies, index, responses, avgRespTime) => {
  if (index === agentReplies.length) {
    return {avgRespTime, responses}
  } else {
    const reply = agentReplies[index]
    const firstMsg = messages[0]

    if (reply._id === firstMsg._id) {
      let lastMsgCriteria = [
        {$match: {_id: {$lt: firstMsg._id}, subscriber_id: subscriber._id}},
        {$sort: {_id: -1}},
        {$limit: 1}
      ]
      return callApi('livechat/aggregate', 'post', lastMsgCriteria, 'kibochat')
        .then(lastMsg => {
          if (lastMsg && lastMsg.length > 0 && lastMsg[0].format === 'facebook') {
            responses = responses + 1
            avgRespTime = ((new Date(firstMsg.datetime) - new Date(lastMsg[0].datetime)) + avgRespTime) / responses
            return _calculateAvgResponseTime(subscriber, messages, firstMsg, index + 1, responses, avgRespTime)
          } else {
            return _calculateAvgResponseTime(subscriber, messages, firstMsg, index + 1, responses, avgRespTime)
          }
        })
        .catch(err => {
          const message = err || 'Error at finding last message'
          logger.serverLog(message, `${TAG}: exports._calculateAvgResponseTime`, {}, {subscriber, message}, 'error')
          return _calculateAvgResponseTime(subscriber, messages, firstMsg, index + 1, responses, avgRespTime)
        })
    } else {
      const currentMsgIndex = messages.findIndex((msg) => msg._id === reply._id)
      if (messages[currentMsgIndex - 1].format === 'facebook') {
        responses = responses + 1
        avgRespTime = ((new Date(reply.datetime) - new Date(messages[currentMsgIndex - 1].datetime)) + avgRespTime) / responses
        return _calculateAvgResponseTime(subscriber, messages, firstMsg, index + 1, responses, avgRespTime)
      } else {
        return _calculateAvgResponseTime(subscriber, messages, firstMsg, index + 1, responses, avgRespTime)
      }
    }
  }
}
