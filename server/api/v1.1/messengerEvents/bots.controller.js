const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const waitingSubscribersDL = require('../smartReplies/waitingSubscribers.datalayer')
const smartRepliesDL = require('../smartReplies/bots.datalayer')
const intentsDL = require('../intents/datalayer')
const unansweredQuestionsDL = require('../smartReplies/unansweredQuestions.datalayer')
const { callGoogleApi } = require('../../global/googleApiCaller')
const batchApi = require('../../global/batchApi')
const { facebookApiCaller } = require('../../global/facebookApiCaller')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const messengerPayload = req.body.entry[0].messaging[0]
  callApi(`pages/query`, 'post', { pageId: messengerPayload.recipient.id, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: messengerPayload.sender.id, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          const messageData = {
            text: 'Thank you. Our agent will get in touch with you soon.'
          }
          const data = {
            tag: 'NON_PROMOTIONAL_SUBSCRIPTION',
            messaging_type: 'MESSAGE_TAG',
            recipient: JSON.stringify({id: subscriber.senderId}),
            message: messageData
          }
          facebookApiCaller('v4.0', `me/messages?access_token=${page.accessToken}`, 'POST', data)
            .then(response => {
              if (response.body.error) {
                logger.serverLog(TAG, response.body.error, 'error')
              } else {
                logger.serverLog(TAG, 'Talk to human message sent successfully')
              }
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
            })

          let payload = JSON.parse(messengerPayload.message.quick_reply.payload)
          waitingSubscribersDL.findOneWaitingSubscriberObjectUsingQuery({'subscriberId._id': subscriber._id, botId: payload.bot_id})
            .then(waitingSubscriber => {
              if (waitingSubscriber) {
                logger.serverLog(TAG, `Waiting Subscriber already created`, 'error')
              } else {
                waitingSubscribersDL.createWaitingSubscriberObject({
                  botId: payload.bot_id,
                  subscriberId: subscriber,
                  pageId: page,
                  intentId: payload.intentId,
                  question: payload.question
                })
                  .then(created => {
                    logger.serverLog(TAG, `Created waitingSubscriber ${JSON.stringify(created)}`)
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to create waitingSubscriber ${JSON.stringify(err)}`, 'error')
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch waitingSubscriber ${JSON.stringify(err)}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}

exports.respondUsingBot = (page, subscriber, text) => {
  logger.serverLog(TAG, 'respondUsingBot is hit')
  smartRepliesDL.findOneBotObjectUsingQuery({pageId: page._id})
    .then(bot => {
      if (bot && bot.isActive === 'true') {
        waitingSubscribersDL.findOneWaitingSubscriberObjectUsingQuery({'subscriberId._id': subscriber._id, botId: bot._id})
          .then(waitingSubscriber => {
            if (waitingSubscriber) {
              logger.serverLog(TAG, 'subscriber is in waiting list')
            } else {
              let dialogflowData = {
                queryInput: {
                  text: {
                    languageCode: 'en',
                    text: text.length > 256 ? text.substring(0, 256) : text
                  }
                }
              }
              callGoogleApi(
                `https://dialogflow.googleapis.com/v2/projects/${bot.gcpPojectId.toLowerCase()}/agent/sessions/${subscriber._id}`,
                'POST',
                dialogflowData
              )
                .then(result => {
                  let intentId = result.intent.name.split('/')[result.intent.name.length - 1]
                  intentsDL.findOneIntent({dialogflowIntentId: intentId})
                    .then(intent => {
                      if (intent) {
                        intent.answer.push(_talkToHumanPayload(bot, intent, text))
                        _handleIntentFound(bot, intent.answer, subscriber, page)
                      } else {
                        _handleIntentNotFound(bot, text)
                      }
                    })
                    .catch(err => {
                      logger.serverLog(TAG, err, 'error')
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, err, 'error')
                })
            }
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
          })
      } else {
        logger.serverLog(TAG, 'bot not found and is disabled.')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const _handleIntentFound = (bot, payload, subscriber, page) => {
  const updateHitCount = smartRepliesDL.updateBotObject({ _id: bot._id }, { $inc: { 'hitCount': 1 } })
  const sendMessages = batchApi.sendMessages(subscriber, payload, page)
  Promise.all([updateHitCount, sendMessages])
    .then(result => {
      logger.serverLog(TAG, 'Bot replied successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const _handleIntentNotFound = (bot, text) => {
  let unansweredQuestionData = {
    botId: bot._id,
    intentId: 'Not Found',
    Question: text,
    Confidence: 0
  }
  const updateMissCount = smartRepliesDL.updateBotObject({ _id: bot._id }, { $inc: { 'missCount': 1 } })
  const createUnansweredQuestion = unansweredQuestionsDL.createUnansweredQuestionObject(unansweredQuestionData)
  Promise.all([updateMissCount, createUnansweredQuestion])
    .then(results => {
      logger.serverLog(TAG, 'No intent found for given query')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const _talkToHumanPayload = (bot, intent, text) => {
  let payload = {
    componentType: 'text',
    text: 'This is an automated reply. If you wish to talk to a human agent, please click the button below:',
    quickReplies: [
      {
        'content_type': 'text',
        'title': 'Talk to Human',
        'payload': JSON.stringify(
          {
            bot_id: bot._id,
            option: 'talkToHuman',
            intentId: intent._id,
            question: text
          }
        )
      }
    ]
  }
  return payload
}
