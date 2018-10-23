const logger = require('../../../components/logger')
let request = require('request')

const prepareSubscribersPayload = (subscribers) => {
  let subsArray = []
  let subscribersPayload = []
  for (let i = 0; i < subscribers.length; i++) {
    subsArray.push(subscribers[i]._id)
    subscribersPayload.push({
      _id: subscribers[i]._id,
      firstName: subscribers[i].firstName,
      lastName: subscribers[i].lastName,
      locale: subscribers[i].locale,
      gender: subscribers[i].gender,
      timezone: subscribers[i].timezone,
      profilePic: subscribers[i].profilePic,
      companyId: subscribers[i].companyId,
      pageScopedId: '',
      email: '',
      senderId: subscribers[i].senderId,
      pageId: subscribers[i].pageId,
      datetime: subscribers[i].datetime,
      isEnabledByPage: subscribers[i].isEnabledByPage,
      isSubscribed: subscribers[i].isSubscribed,
      phoneNumber: subscribers[i].phoneNumber,
      unSubscribedBy: subscribers[i].unSubscribedBy,
      tags: [],
      source: subscribers[i].source
    })
  }
  return {ids: subsArray, payload: subscribersPayload}
}

const createBotPayload = (req, companyUser, witres, uniquebotName) => {
  var bot = {
    pageId: req.body.pageId, // TODO ENUMS
    userId: req.user._id,
    botName: req.body.botName,
    companyId: companyUser.companyId,
    witAppId: witres.body.app_id,
    witToken: witres.body.access_token,
    witAppName: uniquebotName,
    isActive: req.body.isActive,
    hitCount: 0,
    missCount: 0
  }
  return bot
}
const getEntities = (payload) => {
  var transformed = []
  for (var i = 0; i < payload.length; i++) {
    transformed.push(payload[i].intent_name)
  }
  logger.serverLog(`Entities extracted ${JSON.stringify(transformed)}`)
  return transformed
}
const trainingPipline = (entities, payload, token) => {
  for (let i = 0; i < entities.length; i++) {
    request(
      {
        'method': 'DELETE',
        'uri': 'https://api.wit.ai/entities/intent/values/' + entities[i] + '?v=20170307',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      },
      (err, witres) => {
        if (err) {
          return logger.serverLog(
            'Error Occured In Training Pipeline in WIT.AI app')
        }
        logger.serverLog(`Response from Training Pipeline ${JSON.stringify(witres)}`)
        if (i === entities.length - 1) {
          trainBot(payload, token)
        }
        logger.serverLog(`Response from Training Pipeline ${JSON.stringify(witres)}`)
      })
  }
}
function trainBot (payload, token) {
  var transformed = transformPayload(payload)
  logger.serverLog(`Payload Transformed ${JSON.stringify(transformed)}`)
  request(
    {
      'method': 'POST',
      'uri': 'https://api.wit.ai/samples?v=20170307',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: transformed,
      json: true
    },
    (err, witres) => {
      if (err) {
        return logger.serverLog('Error Occured In Training WIT.AI app')
      }
      logger.serverLog(`WitAI bot trained successfully ${JSON.stringify(witres)}`)
    })
}
function transformPayload (payload) {
  var transformed = []
  for (var i = 0; i < payload.length; i++) {
    for (var j = 0; j < payload[i].questions.length; j++) {
      var sample = {}
      sample.text = payload[i].questions[j]
      sample.entities = [{
        entity: 'intent',
        value: payload[i].intent_name
      }]
      transformed.push(sample)
    }
  }
  return transformed
}
exports.getEntities = getEntities
exports.prepareSubscribersPayload = prepareSubscribersPayload
exports.createBotPayload = createBotPayload
exports.trainingPipline = trainingPipline
