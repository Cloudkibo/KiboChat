const logger = require('../../../components/logger')
const logicLayer = require('./smartReplies.logicLayer')
const BotsDataLayer = require('./bots.datalayer')
const UnAnsweredQuestions = require('./unansweredQuestions.datalayer')
const WaitingSubscribers = require('./waitingSubscribers.datalayer')
const utility = require('../utility')
const TAG = 'api/smart_replies/bots.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { callGoogleApi } = require('../../global/googleApiCaller')
const config = require('../../../config/environment')
const async = require('async')
const { callApi } = require('../utility')
const intentsDataLayer = require('../intents/datalayer')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  BotsDataLayer.findAllBotObjectsUsingQuery({ companyId: req.user.companyId })
    .then(bots => {
      if (bots && bots.length > 0) {
        populateBot(bots, req)
          .then(result => {
            sendSuccessResponse(res, 200, result.bots)
          })
      } else {
        sendSuccessResponse(res, 200, [])
      }
    })
    .catch(err => {
      const message = err || 'Error fetching bots from companyId'
      logger.serverLog(message, `${TAG}: exports.index`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Error fetching bots from companyId ${err}`)
    })
}

const _createGCPProject = (data, callback) => {
  const projectData = {
    projectId: data.gcpPojectId.toLowerCase(),
    name: `${data.botName}`,
    parent: {
      type: 'organization',
      id: config.GOOGLE_ORGANIZATION_ID
    }
  }
  callGoogleApi(
    'https://cloudresourcemanager.googleapis.com/v1beta1/projects/',
    'POST',
    projectData
  )
    .then(result => {
      callback()
    })
    .catch(err => {
      callback(err)
    })
}

const _createDialogFlowAgent = (data, callback) => {
  const agentData = {
    displayName: data.dialogFlowAgentId,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  callGoogleApi(
    `https://dialogflow.googleapis.com/v2/projects/${data.gcpPojectId.toLowerCase()}/agent`,
    'POST',
    agentData
  )
    .then(result => {
      callback()
    })
    .catch(err => {
      callback(err)
    })
}

const _createBotRecordInDB = (data, callback) => {
  const botData = {
    pageId: data.pageId,
    userId: data.user._id,
    botName: data.botName,
    companyId: data.user.companyId,
    gcpPojectId: data.gcpPojectId.toLowerCase(),
    dialogFlowAgentId: data.dialogFlowAgentId,
    hitCount: 0,
    missCount: 0
  }
  BotsDataLayer.createBotObject(botData)
    .then(newBot => {
      data.botData = newBot
      callback()
    })
    .catch(err => {
      callback(err)
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.bots !== -1 && companyUsage.bots >= planUsage.bots) {
            return res.status(500).json({
              status: 'failed',
              description: `Your smart replies limit has reached. Please upgrade your plan to create more smart replies.`
            })
          } else {
            let data = {
              user: req.user,
              pageId: req.body.pageId,
              botName: req.body.botName,
              gcpPojectId: `${req.body.botName}-${req.body.pageId.substring(req.body.pageId.length - 4)}`,
              dialogFlowAgentId: `${req.body.botName}-${req.body.pageId.substring(req.body.pageId.length - 4)}`
            }
            async.series([
              _createGCPProject.bind(null, data),
              _createDialogFlowAgent.bind(null, data),
              _createBotRecordInDB.bind(null, data)
            ], function (err) {
              if (err) {
                const message = err || 'Failed to create bot.'
                logger.serverLog(message, `${TAG}: exports.create`, req.body, {data}, 'error')
                sendErrorResponse(res, 500, 'Failed to create bot.')
              } else {
                updateCompanyUsage(req.user.companyId, 'bots', 1)
                sendSuccessResponse(res, 200, data.botData)
              }
            })
          }
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Error fetching company usage ${err}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Error fetching plan usage ${err}`)
    })
}

exports.edit = function (req, res) {
  BotsDataLayer.genericUpdateBotObject({ _id: req.body.botId }, { isActive: req.body.isActive, botName: req.body.botName })
    .then(result => {
      sendSuccessResponse(res, 200, 'Bot updated successfully!')
    })
    .catch(err => {
      const message = err || 'Error in updating bot status'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in updating bot status${JSON.stringify(err)}`)
    })
}

const _createDialogFlowIntent = (data) => {
  const intentData = logicLayer.createDialoFlowIntentData({name: data.name, questions: data.questions})
  return callGoogleApi(
    `https://dialogflow.googleapis.com/v2/projects/${data.gcpPojectId.toLowerCase()}/agent/intents`,
    'POST',
    intentData
  )
    .then()
    .catch(err => {
      const message = err || 'Error in creating dialogflow intent'
      logger.serverLog(message, `${TAG}: exports._createDialogFlowIntent`, {}, {data}, 'error')
    })
}

const _updateDialogFlowIntent = (data) => {
  const intentData = logicLayer.createDialoFlowIntentData({name: data.name, questions: data.questions})
  return callGoogleApi(
    `https://dialogflow.googleapis.com/v2/projects/${data.gcpPojectId.toLowerCase()}/agent/intents/${data.dialogflowIntentId}`,
    'PATCH',
    intentData
  )
    .then()
    .catch(err => {
      const message = err || 'Error in updating dialogflow intent'
      logger.serverLog(message, `${TAG}: exports._updateDialogFlowIntent`, {}, {data}, 'error')
    })
}

const _updateIntentRecordInDb = (data) => {
  return intentsDataLayer.updateOneIntent(
    {
      _id: data.intentId
    },
    {
      name: data.name,
      questions: data.questions,
      answer: data.answer,
      dialogflowIntentId: data.dialogflowIntentId
    }
  )
}

exports.trainBot = function (req, res) {
  if (req.body.dialogflowIntentId) {
    _updateDialogFlowIntent(req.body)
      .then(intent => {
        _updateIntentRecordInDb(req.body)
          .then(result => {
            sendSuccessResponse(res, 200, 'Bot trained succssfully!')
          })
          .catch(err => {
            const message = err || 'Failed to train bot.'
            logger.serverLog(message, `${TAG}: exports.trainBot`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, 'Failed to train bot.')
          })
      })
      .catch(err => {
        const message = err || 'Failed to train bot.'
        logger.serverLog(message, `${TAG}: exports.trainBot`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, 'Failed to train bot.')
      })
  } else {
    _createDialogFlowIntent(req.body)
      .then(intent => {
        let intentPath = intent.data.name.split('/')
        req.body.dialogflowIntentId = intentPath[intentPath.length - 1]
        _updateIntentRecordInDb(req.body)
          .then(result => {
            sendSuccessResponse(res, 200, 'Bot trained succssfully!')
          })
          .catch(err => {
            const message = err || 'Failed to train bot.'
            logger.serverLog(message, `${TAG}: exports.trainBot`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, 'Failed to train bot.')
          })
      })
      .catch(err => {
        const message = err || 'Failed to train bot.'
        logger.serverLog(message, `${TAG}: exports.trainBot`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, 'Failed to train bot.')
      })
  }
}

exports.waitingReply = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`subscribers/query`, 'post', {companyId: companyUser.companyId, isEnabledByPage: true, isSubscribed: true, completeInfo: true})
        .then(subscribers => {
          let obj = logicLayer.prepareSubscribersPayload(subscribers)
          let subsArray = obj.subsArray
          let subscribersPayload = obj.subscribersPayload
          utility.callApi(`tags/query`, 'post', { subscriberId: { $in: subsArray }, companyId: companyUser.companyId })
            .then(tags => {
              for (let i = 0; i < subscribers.length; i++) {
                for (let j = 0; j < tags.length; j++) {
                  if (subscribers[i]._id.toString() === tags[j].subscriberId.toString()) {
                    subscribersPayload[i].tags.push(tags[j].tagId.tag)
                  }
                }
              }
              sendSuccessResponse(res, 200, subscribersPayload)
            })
            .catch(err => {
              const message = err || 'Error fetching subscribers in waiting reply'
              logger.serverLog(message, `${TAG}: exports.waitingReply`, {}, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Error fetching subscribers in waiting reply ${err}`)
            })
        })
        .catch(err => {
          const message = err || 'Error fetching subscribers in waiting reply'
          logger.serverLog(message, `${TAG}: exports.waitingReply`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Error fetching subscribers in waiting reply ${err}`)
        })
    })
    .catch(err => {
      const message = err || 'Error fetching company user'
      logger.serverLog(message, `${TAG}: exports.waitingReply`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error fetching company user ${err}`)
    })
}

exports.details = function (req, res) {
  BotsDataLayer.findOneBotObject(req.body.botId)
    .then(bot => {
      utility.callApi(`pages/query`, 'post', {_id: bot.pageId})
        .then(page => {
          bot.pageId = page[0]
          sendSuccessResponse(res, 200, bot)
        })
        .catch(err => {
          const message = err || 'Error in fetching page'
          logger.serverLog(message, `${TAG}: exports.details`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Error in fetching page ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in finding bot details'
      logger.serverLog(message, `${TAG}: exports.details`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in finding bot details ${JSON.stringify(err)}`)
    })
}

exports.unAnsweredQueries = function (req, res) {
  UnAnsweredQuestions.findAllUnansweredQuestionObjectsUsingQuery({botId: req.body.botId})
    .then(queries => {
      sendSuccessResponse(res, 200, queries)
    })
    .catch(err => {
      const message = err || 'Error in finding unanswered queries'
      logger.serverLog(message, `${TAG}: exports.unAnsweredQueries`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in finding unanswered queries ${JSON.stringify(err)}`)
    })
}

const _getWaitingSubscribers = (criteria, callback) => {
  WaitingSubscribers.findUsingAggregate(criteria)
    .then(waitingSubscribers => {
      callback(null, waitingSubscribers)
    })
    .catch(err => {
      callback(err)
    })
}

exports.waitSubscribers = function (req, res) {
  const criteria = logicLayer.getAggregateCriterias(req.body)
  async.parallelLimit([
    _getWaitingSubscribers.bind(null, criteria.countCriteria),
    _getWaitingSubscribers.bind(null, criteria.fetchCriteria)
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Failed to fetch waiting subscribers'
      logger.serverLog(message, `${TAG}: exports.waitSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch waiting subscribers')
    } else {
      let payload = {
        count: results[0].length > 0 ? results[0][0].count : 0,
        waitingSubscribers: results[1]
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}

exports.removeWaitSubscribers = function (req, res) {
  WaitingSubscribers.deleteWaitingSubscriberObject(req.body._id)
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(err => {
      const message = err || 'Error in removing waiting subscribers'
      logger.serverLog(message, `${TAG}: exports.removeWaitSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in removing waiting subscribers ${JSON.stringify(err)}`)
    })
}

const _deleteGCPProject = (bot, callback) => {
  callGoogleApi(
    `https://cloudresourcemanager.googleapis.com/v1beta1/projects/${bot.gcpPojectId}`,
    'DELETE'
  )
    .then(result => {
      callback()
    })
    .catch(err => {
      callback(err)
    })
}

const _deleteBotRecordInDB = (bot, callback) => {
  BotsDataLayer.deleteBotObject(bot._id)
    .then((value) => {
      callback()
    })
    .catch((err) => {
      callback(err)
    })
}

exports.delete = function (req, res) {
  callApi('user/authenticatePassword', 'post', {email: req.user.email, password: req.body.password})
    .then(authenticated => {
      return BotsDataLayer.findOneBotObject(req.body.botId)
    })
    .then(bot => {
      if (!bot) {
        sendErrorResponse(res, 500, '', `Bot not found ${JSON.stringify(bot)}`)
      } else {
        async.series([
          _deleteGCPProject.bind(null, bot),
          _deleteBotRecordInDB.bind(null, bot)
        ], function (err) {
          if (err) {
            const message = err || 'error in async'
            logger.serverLog(message, `${TAG}: exports.delete`, {}, {user: req.user}, 'error')
            sendErrorResponse(res, 500, 'Failed to delete bot.')
          } else {
            updateCompanyUsage(req.user.companyId, 'bots', -1)
            sendSuccessResponse(res, 200, 'Bot deleted succssfully!')
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Error in finding bot object'
      logger.serverLog(message, `${TAG}: exports.delete`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Incorrect password', `Error in finding bot object ${JSON.stringify(err)}`)
    })
}

function populateBot (bots, req) {
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < bots.length; i++) {
      utility.callApi(`pages/query`, 'post', {_id: bots[i].pageId})
        .then(page => {
          bots[i].pageId = page[0]
          if (bots.length - 1 === i) {
            resolve({bots})
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch bots'
          logger.serverLog(message, `${TAG}: exports.populateBot`, {}, {bots}, 'error')
          reject(err)
        })
    }
  })
}
