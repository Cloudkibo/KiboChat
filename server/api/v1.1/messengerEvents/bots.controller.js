const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const needle = require('needle')
const dataLayer = require('../smartReplies/waitingSubscribers.datalayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  callApi(`pages/query`, 'post', { pageId: req.body.entry[0].messaging[0].recipient.id, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: req.body.entry[0].messaging[0].sender.id, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          const messageData = {
            text: 'Thank you. Our agent will get in touch with you soon.'
          }
          const data = {
            messaging_type: 'RESPONSE',
            recipient: JSON.stringify({id: subscriber.senderId}), // this is the subscriber id
            message: messageData
          }
          needle.post(
            `https://graph.facebook.com/v2.6/me/messages?access_token=${subscriber.pageId.accessToken}`,
            data, (err4, respp) => {
              if (err4) {
                logger.serverLog(TAG, `Error at talkToHuman ${JSON.stringify(err4)}`, 'error')
              }
              logger.serverLog(TAG, `Response from talkToHuman ${JSON.stringify(respp.body)}`, 'error')
            })
          let payload = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
          dataLayer.findAllWaitingSubscriberObjectsUsingQuery({botId: payload.bot_id,
            subscriberId: subscriber._id,
            pageId: page._id,
            Question: payload.question})
            .then(waitingSubscriber => {
              if (waitingSubscriber && waitingSubscriber.length > 0) {
                logger.serverLog(TAG, `Waiting Subscriber already created`, 'error')
              } else {
                dataLayer.createWaitingSubscriberObject({botId: payload.bot_id,
                  subscriberId: subscriber._id,
                  pageId: page._id,
                  intentId: payload.intentId,
                  Question: payload.question})
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
