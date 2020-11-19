const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/menu.controller.js'
const {callApi} = require('../utility')
const logicLayer = require('./logiclayer')
const request = require('request')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let replyPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            sendMenuReplyToSubscriber(replyPayload, subscriber.senderId, subscriber.firstName, subscriber.lastName, subscriber.pageId.accessToken)
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
    })
}

function sendMenuReplyToSubscriber (replyPayload, senderId, firstName, lastName, accessToken) {
  for (let i = 0; i < replyPayload.length; i++) {
    // let messageData = logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true)
    // logger.serverLog(TAG, `messageData ${JSON.stringify(messageData)}`)
    // console.log('messageData in sendMenuReplyToSubscriber', messageData)
    request(
      {
        'method': 'POST',
        'json': true,
        'formData': logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true),
        'uri': 'https://graph.facebook.com/v6.0/me/messages?access_token=' + accessToken
      },
      (err, res) => {
        if (err) {
          const message = err || 'At send message to fb'
          logger.serverLog(message, `${TAG}: exports.sendMenuReplyToSubscriber`, {}, {replyPayload, senderId, firstName, lastName}, 'error')
        }
      })
  }
}
