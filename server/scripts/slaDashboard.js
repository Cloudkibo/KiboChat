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
