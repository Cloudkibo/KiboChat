const logger = require('../../../components/logger')
const logicLayer = require('./smartReplies.logicLayer')
const BotsDataLayer = require('./bots.datalayer')
const UnAnsweredQuestions = require('./unansweredQuestions.datalayer')
const WaitingSubscribers = require('./waitingSubscribers.datalayer')
const utility = require('../utility')
const TAG = 'api/smart_replies/bots.controller.js'
let request = require('request')
const WIT_AI_TOKEN = 'RQC4XBQNCBMPETVHBDV4A34WSP5G2PYL'
const util = require('util')
const needle = require('needle')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      BotsDataLayer.findAllBotObjectsUsingQuery({ companyId: companyUser.companyId })
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
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Error fetching company user ${err}`)
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

exports.create = function (req, res) {
  var uniquebotName = req.body.botName + req.user._id + Date.now()
  logger.serverLog(TAG, `Create Bot Request ${JSON.stringify(req.user)} ${uniquebotName}}`, 'debug')
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      logger.serverLog(TAG, `Company User ${companyUser}}`, 'debug')
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
            return logger.serverLog(TAG, 'Error Occured In Creating WIT.AI app', 'error')
          } else {
            if (witres.statusCode !== 200) {
              sendErrorResponse(res, 500, { error: witres.body.errors })
            } else {
              var botPayload = logicLayer.createBotPayload(req, companyUser, witres, uniquebotName)
              BotsDataLayer.createBotObject(botPayload)
                .then(newBot => {
                  sendSuccessResponse(res, 200, newBot)
                })
                .catch(err => {
                  sendErrorResponse(res, 500, '', `Error creating bot object ${err}`)
                })
            }
          }
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.edit = function (req, res) {
  logger.serverLog(`Adding questions in edit bot ${JSON.stringify(req.body)}`, 'debug')
  let payload = req.body.payload
  let botId = req.body.botId
  logicLayer.updatePayloadForVideo(botId, payload, req.headers.authorization)
    .then(updatedPayload => {
      logger.serverLog(TAG, `updatedPayload ${JSON.stringify(updatedPayload)}`, 'debug')
      BotsDataLayer.updateBotObject({ _id: req.body.botId }, { payload: req.body.payload })
        .then(bot => {
          BotsDataLayer.findOneBotObject(req.body.botId)
            .then(bot => {
              logger.serverLog(`Returning Bot details ${JSON.stringify(bot)}`, 'error')
              var entities = logicLayer.getEntities(req.body.payload)
              logicLayer.trainingPipline(entities, req.body.payload, bot.witToken)
            })
          sendSuccessResponse(res, 200)
        })
        .catch((err) => {
          sendErrorResponse(res, 500, '', `Error in updating bot ${JSON.stringify(err)}`)
        })
    })
}

exports.status = function (req, res) {
  logger.serverLog(`Updating bot status ${JSON.stringify(req.body)}`, 'debug')
  BotsDataLayer.genericUpdateBotObject({ _id: req.body.botId }, { isActive: req.body.isActive })
    .then(result => {
      logger.serverLog(`affected rows ${result}`, 'debug')
      sendSuccessResponse(res, 200)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in updating bot status${JSON.stringify(err)}`)
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

exports.delete = function (req, res) {
  BotsDataLayer.findOneBotObject(req.body.botId)
    .then(bot => {
      logger.serverLog(TAG, `Deleting Bot details on WitAI ${JSON.stringify(bot)}`, 'debug')
      if (!bot) {
        sendErrorResponse(res, 500, '', `Bot not found ${JSON.stringify(bot)}`)
      }
      request(
        {
          'method': 'DELETE',
          'uri': 'https://api.wit.ai/apps/' + bot.witAppId,
          headers: {
            'Authorization': 'Bearer ' + bot.witToken
          }
        },
        (err, witres) => {
          if (err) {
            logger.serverLog('Error Occured In Deleting WIT.AI app', 'error')
            sendErrorResponse(res, 500, { error: err })
          } else {
            if (witres.statusCode !== 200) {
              logger.serverLog(TAG,
                `Error Occured in deleting Wit ai app ${JSON.stringify(witres.body)}`, 'error')
              sendErrorResponse(res, 500, { error: witres.body.errors })
            } else {
              logger.serverLog(TAG,
                'Wit.ai app deleted successfully')
              BotsDataLayer.deleteBotObject(req.body.botId)
                .then((value) => {
                  sendSuccessResponse(res, 200, value)
                })
                .catch((err) => {
                  sendErrorResponse(res, 500, '', `Error in deleting bot object ${JSON.stringify(err)}`)
                })
            }
          }
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in finding bot object ${JSON.stringify(err)}`)
    })
}

function sendMessenger (message, pageId, senderId, postbackPayload, botId) {
  logger.serverLog(TAG, `sendMessenger message is ${JSON.stringify(message)}`, 'debug')
  utility.callApi(`pages/query`, 'post', {pageId: pageId, connected: true})
    .then(page => {
      page = page[0]
      utility.callApi(`subscribers/query`, 'post', { senderId: senderId, pageId: page._id, companyId: page.companyId })
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
        utility.callApi(`subscribers/query`, 'post', { senderId: senderId, companyId: bot.companyId })
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
    let botsToSend = []
    for (let i = 0; i < bots.length; i++) {
      utility.callApi(`pages/query`, 'post', {_id: bots[i].pageId})
        .then(page => {
          // bots[i].pageId = page[0]
          botsToSend.push({
            blockedSubscribers: bots[i].blockedSubscribers,
            _id: bots[i]._id,
            pageId: page[0],
            userId: bots[i].userId,
            botName: bots[i].botName,
            companyId: bots[i].companyId,
            witAppId: bots[i].witAppId,
            witToken: bots[i].witToken,
            witAppName: bots[i].witAppName,
            isActive: bots[i].isActive,
            hitCount: bots[i].hitCount,
            missCount: bots[i].missCount,
            payload: bots[i].payload,
            datetime: bots[i].datetime
          })
          if (botsToSend.length === bots.length) {
            resolve({bots: botsToSend})
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
          utility.callApi(`subscribers/query`, 'post', {_id: waiting[i].subscriberId, companyId: page[0].companyId})
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
