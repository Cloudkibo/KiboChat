const logger = require('../components/logger')
const TAG = 'scripts/slaDashboard.js'
const { callApi } = require('../api/v1.1/utility')

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
    callApi('subscribers/aggregate', 'post', lastMsgCriteria)
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
                callApi('subscribers/aggregate', 'post', criteria)
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
                callApi('subscribers/aggregate', 'post', criteria)
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

// let avgRespTime = 0
// let responses = 0
// let agentReplies = messages.filter((msg) => msg.format === 'convos')
//
// if (agentReplies.length > 0) {
//  await _calculateAvgResponseTime(subscriber, messages, agentReplies, 0, responses, avgRespTime)
// }

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
      callApi('subscribers/aggregate', 'post', lastMsgCriteria)
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
