const logger = require('../../../components/logger')
const logicLayer = require('./smartReplies.logicLayer')
const BotsDataLayer = require('./bots.datalayer')
const UnAnsweredQuestions = require('./unansweredQuestions.datalayer')
const WaitingSubscribers = require('./waitingSubscribers.datalayer')
const utility = require('../utility')
const TAG = 'api/smart_replies/bots.controller.js'
let request = require('request')
const util = require('util')
const needle = require('needle')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { callGoogleApi } = require('../../global/googleApiCaller')
const config = require('../../../config/environment')
const async = require('async')
const { callApi } = require('../utility')
const intentsDataLayer = require('../intents/datalayer')

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
    displayName: data.dialogFlowAgentId
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
  logger.serverLog(TAG, `Create Bot Request ${req.body.pageId}-${req.body.botName}`, 'debug')
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
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to create bot.')
    } else {
      sendSuccessResponse(res, 200, data.botData)
    }
  })
}

exports.edit = function (req, res) {
  logger.serverLog(`Updating bot info ${JSON.stringify(req.body)}`, 'debug')
  BotsDataLayer.genericUpdateBotObject({ _id: req.body.botId }, { isActive: req.body.isActive, botName: req.body.botName })
    .then(result => {
      sendSuccessResponse(res, 200, 'Bot updated successfully!')
    })
    .catch(err => {
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
}

const _updateDialogFlowIntent = (data) => {
  const intentData = logicLayer.createDialoFlowIntentData({name: data.name, questions: data.questions})
  return callGoogleApi(
    `https://dialogflow.googleapis.com/v2/projects/${data.gcpPojectId.toLowerCase()}/agent/intents/${data.dialogflowIntentId}`,
    'PATCH',
    intentData
  )
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
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 500, 'Failed to train bot.')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
        sendErrorResponse(res, 500, 'Failed to train bot.')
      })
  } else {
    _createDialogFlowIntent(req.body)
      .then(intent => {
        let intentPath = intent.name.split('/')
        req.body.dialogflowIntentId = intentPath[intentPath.length - 1]
        _updateIntentRecordInDb(req.body)
          .then(result => {
            sendSuccessResponse(res, 200, 'Bot trained succssfully!')
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 500, 'Failed to train bot.')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
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
              sendErrorResponse(res, 500, `Error fetching subscribers in waiting reply ${err}`)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Error fetching subscribers in waiting reply ${err}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error fetching company user ${err}`)
    })
}

exports.details = function (req, res) {
  logger.serverLog(`Bot details are following ${JSON.stringify(req.body)}`, 'debug')
  BotsDataLayer.findOneBotObject(req.body.botId)
    .then(bot => {
      utility.callApi(`pages/query`, 'post', {_id: bot.pageId})
        .then(page => {
          bot.pageId = page[0]
          sendSuccessResponse(res, 200, bot)
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Error in fetching page ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in finding bot details ${JSON.stringify(err)}`)
    })
}

exports.unAnsweredQueries = function (req, res) {
  logger.serverLog(TAG, `Fetching unanswered queries ${JSON.stringify(req.body)}`, 'debug')
  UnAnsweredQuestions.findAllUnansweredQuestionObjectsUsingQuery({botId: req.body.botId})
    .then(queries => {
      logger.serverLog(`Returning UnAnswered Queries ${JSON.stringify(queries)}`, 'debug')
      sendSuccessResponse(res, 200, queries)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in finding unanswered queries ${JSON.stringify(err)}`)
    })
}

exports.waitSubscribers = function (req, res) {
  WaitingSubscribers.findAllWaitingSubscriberObjectsUsingQuery({botId: req.body.botId})
    .then(subscribers => {
      logger.serverLog(TAG, `waitSubscribers fetched ${JSON.stringify(subscribers)}`, 'debug')
      if (subscribers && subscribers.length > 0) {
        populateSubscriber(subscribers, req)
          .then(result => {
            sendSuccessResponse(res, 200, result.waitingSubscribers)
          })
      } else {
        sendSuccessResponse(res, 200, [])
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in finding waiting subscribers ${JSON.stringify(err)}`)
    })
}

exports.removeWaitSubscribers = function (req, res) {
  logger.serverLog(TAG, `going to delete waiting subscribers ${JSON.stringify(req.body)}`, 'debug')
  WaitingSubscribers.deleteWaitingSubscriberObject(req.body._id)
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(err => {
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
      console.log('i am authenticated', authenticated)
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
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 500, 'Failed to delete bot.')
          } else {
            sendSuccessResponse(res, 200, 'Bot deleted succssfully!')
          }
        })
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, 'Incorrect password', `Error in finding bot object ${JSON.stringify(err)}`)
    })
}

function sendMessenger (message, pageId, senderId, postbackPayload, botId) {
  logger.serverLog(TAG, `sendMessenger message is ${JSON.stringify(message)}`, 'debug')
  utility.callApi(`pages/query`, 'post', {pageId: pageId, connected: true})
    .then(page => {
      page = page[0]
      utility.callApi(`subscribers/query`, 'post', { senderId: senderId, pageId: page._id, companyId: page.companyId, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber === null) {
            return
          }
          logger.serverLog(TAG, `Subscriber Info ${JSON.stringify(subscriber)}`, 'debug')
          message.senderId = senderId
          logicLayer.getMessageData(message)
            .then(messageData => {
              logger.serverLog(TAG, `messageData: ${JSON.stringify({messageData})}`, 'debug')
              request(
                {
                  'method': 'POST',
                  'json': true,
                  'formData': messageData,
                  'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                    page.accessToken
                },
                (err, res) => {
                  if (err) {
                    return logger.serverLog(TAG,
                      `At send message live chat ${JSON.stringify(err)}`, 'error')
                  } else {
                    if (res.statusCode !== 200) {
                      logger.serverLog(TAG,
                        `At send message live chat response ${JSON.stringify(
                          res.body.error)}`, 'error')
                    }
                    logger.serverLog(TAG, `Response sent to Messenger: ${JSON.stringify(messageData)}`, 'debug')
                    let talkToHumanPaylod = logicLayer.talkToHumanPaylod(botId, message, postbackPayload)
                    needle.post(
                      `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`, talkToHumanPaylod, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err)
                        }
                      })
                  }
                })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to send automated reply ${JSON.stringify(err)}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscribers ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${err}`, 'error')
    })
}

function getWitResponse (message, token, bot, pageId, senderId) {
  logger.serverLog(TAG, 'Trying to get a response from WIT AI', 'debug')
  request(
    {
      'method': 'GET',
      'uri': 'https://api.wit.ai/message?v=20170307&q=' + message,
      headers: {
        'Authorization': 'Bearer ' + token
      }
    },
    (err, witres) => {
      if (err) {
        logger.serverLog(TAG, 'Error Occured In Getting Response From WIT.AI app', 'error')
        return
      }
      if (!witres.body) {
        logger.serverLog(TAG, 'Error Occured In Getting Response From WIT.AI app', 'error')
        return
      }
      if (!JSON.parse(witres.body).entities) {
        logger.serverLog(TAG, 'Error Occured In Getting Response From WIT.AI app', 'error')
        return
      }
      // logger.serverLog(TAG, `Response from Wit AI Bot ${witres.body}`)
      let temp = JSON.parse(witres.body)
      if (Object.keys(JSON.parse(witres.body).entities).length === 0 || temp.entities.intent[0].confidence < 0.80) {
        logger.serverLog(TAG, 'No response found', 'debug')
        BotsDataLayer.updateBotObject({ _id: bot._id }, { $inc: { 'missCount': 1 } })
          .then(dbRes => {
            // Will only run when the entities are not zero i.e. confidence is low
            let unansweredQuestion = {}
            if (!(Object.keys(JSON.parse(witres.body).entities).length === 0)) {
              let temp = JSON.parse(witres.body)

              unansweredQuestion.botId = bot._id
              unansweredQuestion.intentId = temp.entities.intent[0].value
              unansweredQuestion.Question = temp._text
              unansweredQuestion.Confidence = temp.entities.intent[0].confidence
            } else {
              unansweredQuestion.botId = bot._id
              unansweredQuestion.Question = temp._text
            }
            UnAnsweredQuestions.createUnansweredQuestionObject(unansweredQuestion)
              .then(result => {
                logger.serverLog(TAG, result, 'debug')
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to create unansweredQuestion ${err}`, 'error')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to update bot ${err}`, 'error')
          })
        return { found: false, intent_name: 'Not Found' }
      }
      var intent = JSON.parse(witres.body).entities.intent[0]
      logger.serverLog(TAG, `intent ${util.inspect(intent)}`, 'debug')
      if (intent.confidence > 0.80) {
        logger.serverLog(TAG, 'Responding using bot: ' + intent.value, 'debug')
        utility.callApi(`subscribers/query`, 'post', { senderId: senderId, companyId: bot.companyId, completeInfo: true })
          .then(subscriber => {
            subscriber = subscriber[0]
            // Bot will not respond if a subscriber is waiting subscriber
            WaitingSubscribers.findOneWaitingSubscriberObjectUsingQuery({ 'subscriberId': subscriber._id })
              .then(sub => {
                logger.serverLog(TAG, 'bot is ' + JSON.stringify(sub), 'debug')
                // If sub not found, reply the answer
                if (!sub) {
                  for (let i = 0; i < bot.payload.length; i++) {
                    if (bot.payload[i].intent_name === intent.value) {
                      let postbackPayload = {
                        'action': 'waitingSubscriber',
                        'botId': bot._id,
                        'subscriberId': subscriber._id,
                        'pageId': pageId,
                        'intentId': intent.value,
                        'Question': temp._text
                      }
                      // Increase the hit count
                      BotsDataLayer.genericUpdateBotObject({ _id: bot._id }, { $inc: { 'hitCount': 1 } })
                        .then(dbRes => {
                          logger.serverLog(TAG, 'bot updated successfully!')
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to update bot ${err}`, 'error')
                        })
                      // send the message to sub
                      sendMessenger(bot.payload[i], pageId, senderId, postbackPayload, bot._id)
                    }
                  }
                } else {
                  logger.serverLog(TAG, 'reply will no tbe send for waiting subscriber')
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch waitingSubscriber ${err}`, 'error')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
          })
      }
    })
}

exports.respond = function (pageId, senderId, text) {
  logger.serverLog(TAG, ' ' + pageId + ' ' + senderId + ' ' + text, 'debug')
  utility.callApi(`pages/query`, 'post', {_id: pageId})
    .then(page => {
      page = page[0]
      logger.serverLog(TAG, `PAGES FETCHED ${JSON.stringify(page)}`, 'debug')
      if (page) {
        BotsDataLayer.findAllBotObjectsUsingQuery({ pageId: page._id })
          .then(bot => {
            bot = bot[0]
            if (!bot) {
              logger.serverLog(TAG, `Couldnt find the bot while trying to respond ${page._id}`)
            }
            if (bot && bot.isActive === 'true') {
              // Write the bot response logic here
              logger.serverLog(TAG, 'Responding using the bot as status is Active', 'debug')
              getWitResponse(text, bot.witToken, bot, page.pageId, senderId)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch bots ${err}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch pages ${err}`, 'error')
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
          logger.serverLog(TAG, `Failed to fetch bots ${JSON.stringify(err)}`, 'error')
          reject(err)
        })
    }
  })
}
function populateSubscriber (waiting, req) {
  return new Promise(function (resolve, reject) {
    let sendPayload = []
    for (let i = 0; i < waiting.length; i++) {
      utility.callApi(`pages/query`, 'post', {_id: waiting[i].pageId})
        .then(page => {
          utility.callApi(`subscribers/query`, 'post', {_id: waiting[i].subscriberId, companyId: page[0].companyId, completeInfo: true})
            .then(subscriber => {
              sendPayload.push({
                _id: waiting[i]._id,
                botId: waiting[i].botId,
                pageId: page[0],
                subscriberId: subscriber[0],
                intentId: waiting[i].intentId,
                Question: waiting[i].Question,
                datetime: waiting[i].datetime
              })
              if (sendPayload.length === waiting.length) {
                logger.serverLog(TAG, `sendPayload ${JSON.stringify(sendPayload)}`, 'debug')
                resolve({waitingSubscribers: sendPayload})
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
              reject(err)
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
          reject(err)
        })
    }
  })
}
