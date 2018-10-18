const logger = require('../../../components/logger')
const logicLayer = require('./smartReplies.logicLayer')
const BotsDataLayer = require('./bots.datalayer')
const UnAnsweredQuestions = require('./unansweredQuestions.datalayer')
const WaitingSubscribers = require('./waitingSubscribers.datalayer')
const utility = '../utility'
const TAG = 'api/smart_replies/bots.controller.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      BotsDataLayer.findOneBotObjectUsingQuery({ companyId: companyUser.companyId })
        .then(bots => {
          return res.status(200).json({ status: 'success', payload: bots })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', description: `Error fetching bots from companyId ${err}`})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', description: `Error fetching company user ${err}`})
    })
}

exports.waitingReply = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`subscribers/query`, 'post', {companyId: companyUser.companyId, isEnabledByPage: true, isSubscribed: true})
        .then(subscribers => {
          let obj = logicLayer.prepareSubscribersPayload(subscribers)
          let subsArray = obj.subsArray
          let subscribersPayload = obj.subscribersPayload
          utility.callApi(`tagSubscribers/query`, 'post', { subscriberId: { $in: subsArray } })
            .then(tags => {
              for (let i = 0; i < subscribers.length; i++) {
                for (let j = 0; j < tags.length; j++) {
                  if (subscribers[i]._id.toString() === tags[j].subscriberId.toString()) {
                    subscribersPayload[i].tags.push(tags[j].tagId.tag)
                  }
                }
              }
              res.status(200).json({ status: 'success', payload: subscribersPayload })
            })
            .catch(err => {
              return res.status(500).json({status: 'failed', description: `Error fetching subscribers in waiting reply ${err}`})
            })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', description: `Error fetching subscribers in waiting reply ${err}`})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', description: `Error fetching company user ${err}`})
    })
}

exports.create = function (req, res) {
  var uniquebotName = req.body.botName + req.user._id + Date.now()
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      var witResponse = logicLayer.witRequest(uniquebotName)
      if (witResponse.status === 'failed') {
        return res.status(500).json({
          status: 'failed',
          description: `Error Occured In Creating WIT.AI app ${JSON.stringify(witResponse.payload)}`
        })
      }
      if (witResponse.status === 'success') {
        var witres = witResponse.payload
        if (witres.statusCode !== 200) {
          logger.serverLog(`Error occurred in creating Wit ai app ${JSON.stringify(witres.body.errors)}`)
          return res.status(500).json({ status: 'failed', payload: { error: witres.body.errors } })
        } else {
          logger.serverLog('Wit.ai app created successfully', witres.body)
          var botPayload = logicLayer.createBotPayload(req, companyUser, witres, uniquebotName)
          BotsDataLayer.createBotObject(botPayload)
            .then(newBot => {
              return res.status(200).json({ status: 'success', payload: newBot })
            })
            .catch(err => {
              return res.status(500).json({status: 'failed', description: `Error creating bot object ${err}`})
            })
        }
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.edit = function (req, res) {
  logger.serverLog(`Adding questions in edit bot ${JSON.stringify(req.body)}`)
  BotsDataLayer.genericFindByIdAndUpdate({ _id: req.body.botId }, { $set: { payload: req.body.payload } })
    .then(bot => {
      logger.serverLog(`Returning Bot details ${JSON.stringify(bot)}`)
      var entities = logicLayer.getEntities(req.body.payload)
      var res = logicLayer.trainingPipline(entities, req.body.payload, bot[0].witToken)
      if (res.status === 'success') {
        return res.status(200).json({ status: 'success' })
      }
    })
    .catch((err) => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in updating bot ${JSON.stringify(err)}`
      })
    })
}

exports.status = function (req, res) {
  logger.serverLog(`Updating bot status ${JSON.stringify(req.body)}`)
  BotsDataLayer.genericUpdateBotObject({ _id: req.body.botId }, { isActive: req.body.isActive })
    .then(result => {
      logger.serverLog(`affected rows ${result}`)
      return res.status(200).json({ status: 'success' })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in updating bot status${JSON.stringify(err)}`
      })
    })
}

exports.details = function (req, res) {
  logger.serverLog(`Bot details are following ${JSON.stringify(req.body)}`)
  BotsDataLayer.findOneBotObject(req.body.botId)
    .then(bot => {
      logger.serverLog(`Returning Bot details ${JSON.stringify(bot)}`)
      return res.status(200).json({ status: 'success', payload: bot[0] })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in finding bot details ${JSON.stringify(err)}`
      })
    })
}

exports.unAnsweredQueries = function (req, res) {
  logger.serverLog(TAG, `Fetching unanswered queries ${JSON.stringify(req.body)}`)
  UnAnsweredQuestions.findOneUnansweredQuestionObjectUsingQuery({botId: req.body.botId})
    .then(queries => {
      logger.serverLog(`Returning UnAnswered Queries ${JSON.stringify(queries)}`)
      return res.status(200).json({ status: 'success', payload: queries })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in finding unanswered queries ${JSON.stringify(err)}`
      })
    })
}

exports.waitSubscribers = function (req, res) {
  logger.serverLog(TAG, `Fetching waiting subscribers ${JSON.stringify(req.body)}`)
  WaitingSubscribers.findOneWaitingSubscriberObjectUsingQuery({botId: req.body.botId})
    .then(subscribers => {
      logger.serverLog(`Returning waiting subscribers ${JSON.stringify(subscribers)}`)
      return res.status(200).json({ status: 'success', payload: subscribers })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in finding waiting subscribers ${JSON.stringify(err)}`
      })
    })
}

exports.removeWaitSubscribers = function (req, res) {
  logger.serverLog(TAG, `going to delete waiting subscribers ${JSON.stringify(req.body)}`)
  WaitingSubscribers.deleteWaitingSubscriberObject(req.body._id)
    .then(result => {
      return res.status(200).json({ status: 'success', payload: result })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in removing waiting subscribers ${JSON.stringify(err)}`
      })
    })
}
