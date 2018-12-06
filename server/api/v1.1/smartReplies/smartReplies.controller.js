const logger = require('../../../components/logger')
const logicLayer = require('./smartReplies.logicLayer')
const BotsDataLayer = require('./bots.datalayer')
const UnAnsweredQuestions = require('./unansweredQuestions.datalayer')
const WaitingSubscribers = require('./waitingSubscribers.datalayer')
const utility = require('../utility')
const TAG = 'api/smart_replies/bots.controller.js'
let request = require('request')
const WIT_AI_TOKEN = 'RQC4XBQNCBMPETVHBDV4A34WSP5G2PYL'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      BotsDataLayer.findAllBotObjectsUsingQuery({ companyId: companyUser.companyId })
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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`subscribers/query`, 'post', {companyId: companyUser.companyId, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization)
        .then(subscribers => {
          let obj = logicLayer.prepareSubscribersPayload(subscribers)
          let subsArray = obj.subsArray
          let subscribersPayload = obj.subscribersPayload
          utility.callApi(`tags/query`, 'post', { subscriberId: { $in: subsArray } }, req.headers.authorization)
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
  logger.serverLog(TAG, `Create Bot Request ${JSON.stringify(req.user)} ${uniquebotName}}`)
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      logger.serverLog(TAG, `Company User ${companyUser}}`)
      request(
        {
          'method': 'POST',
          'uri': 'https://api.wit.ai/apps?v=20170307',
          headers: {
            'Authorization': 'Bearer ' + WIT_AI_TOKEN,
            'Content-Type': 'application/json'
          },
          body: {
            'name': uniquebotName,
            'lang': 'en',
            'private': 'false'
          },
          json: true
        },
        (err, witres) => {
          if (err) {
            return logger.serverLog(TAG, 'Error Occured In Creating WIT.AI app')
          } else {
            if (witres.statusCode !== 200) {
              return res.status(500).json({ status: 'failed', payload: { error: witres.body.errors } })
            } else {
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
  BotsDataLayer.updateBotObject({ _id: req.body.botId }, { payload: req.body.payload })
    .then(bot => {
      BotsDataLayer.findOneBotObject(req.body.botId)
        .then(bot => {
          logger.serverLog(`Returning Bot details ${JSON.stringify(bot)}`)
          var entities = logicLayer.getEntities(req.body.payload)
          logicLayer.trainingPipline(entities, req.body.payload, bot.witToken)
        })
      return res.status(200).json({ status: 'success' })
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
  BotsDataLayer.updateBotObject({ _id: req.body.botId }, { isActive: req.body.isActive })
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
      return res.status(200).json({ status: 'success', payload: bot })
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

exports.delete = function (req, res) {
  BotsDataLayer.findOneBotObject(req.body.botId)
    .then(bot => {
      logger.serverLog(TAG, `Deleting Bot details on WitAI ${JSON.stringify(bot)}`)
      if (!bot) {
        return res.status(500).json({
          status: 'failed',
          description: `Bot not found ${JSON.stringify(bot)}`
        })
      }
      request(
        {
          'method': 'DELETE',
          'uri': 'https://api.wit.ai/apps/' + bot.witAppId,
          headers: {
            'Authorization': 'Bearer ' + WIT_AI_TOKEN
          }
        },
        (err, witres) => {
          if (err) {
            logger.serverLog('Error Occured In Deleting WIT.AI app')
            return res.status(500).json({ status: 'failed', payload: { error: err } })
          } else {
            if (witres.statusCode !== 200) {
              logger.serverLog(TAG,
                `Error Occured in deleting Wit ai app ${JSON.stringify(witres.body)}`)
              return res.status(500).json({ status: 'failed', payload: { error: witres.body.errors } })
            } else {
              logger.serverLog(TAG,
                'Wit.ai app deleted successfully', witres.body)
              BotsDataLayer.deleteBotObject(req.body.botId)
                .then((value) => {
                  return res.status(200).json({ status: 'success', payload: value })
                })
                .catch((err) => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Error in deleting bot object ${JSON.stringify(err)}`
                  })
                })
            }
          }
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in finding bot object ${JSON.stringify(err)}`
      })
    })
}
