const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const needle = require('needle')
const dataLayer = require('../smartReplies/waitingSubscribers.datalayer')

exports.index = function (req, res) {
  console.log('req.body in talkToHuman', req.body)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  callApi(`subscribers/query`, 'post', { pageId: req.body.entry[0].messaging[0].recipient.id, senderId: req.body.entry[0].messaging[0].sender.id })
    .then(subscriber => {
      subscriber = subscriber[0]
      const messageData = {
        text: 'Thank you. Our agent will get in touch with you soon.'
      }
      console.log('subscriber fetched', subscriber)
      const data = {
        messaging_type: 'RESPONSE',
        recipient: JSON.stringify({id: subscriber.senderId}), // this is the subscriber id
        message: messageData
      }
      console.log('dataTosend', data)
      needle.post(
        `https://graph.facebook.com/v2.6/me/messages?access_token=${subscriber.pageId.accessToken}`,
        data, (err4, respp) => {
          if (err4) {
            logger.serverLog(TAG, `Error at talkToHuman ${JSON.stringify(err4)}`)
          }
          logger.serverLog(TAG, `Response from talkToHuman ${JSON.stringify(respp.body)}`)
          console.log('response from talkToHuman', respp.body)
        })
      let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
      dataLayer.createWaitingSubscriberObject({botId: resp.botId,
        subscriberId: subscriber._id,
        pageId: req.body.entry[0].messaging[0].recipient.id,
        intentId: resp.intentId,
        Question: resp.question})
        .then(created => {
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to create waitingSubscriber ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
    })
}
