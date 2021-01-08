const utility = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')
const { ActionTypes } = require('../../whatsAppMapper/constants')
const whatsAppMapper = require('../../whatsAppMapper/whatsAppMapper')
const { storeChat } = require('../../api/v1.1/whatsAppEvents/controller')
const { facebookApiCaller } = require('../../api/global/facebookApiCaller')

exports.runSessionTimeOutScript = function () {
  let query = {
    purpose: 'findAll',
    match: {$or: [{alertChannel: 'messenger'}, {alertChannel: 'whatsApp'}]}
  }
  utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscriptions => {
      if (subscriptions.length > 0) {
        async.each(subscriptions, function (subscription, cb) {
          let data = {subscription, url: subscription.platform === 'messenger' ? 'livechat' : 'whatsAppChat'}
          async.series([
            _isSessionTimedOut.bind(null, data),
            _shouldSendMessage.bind(null, data),
            _sendMessage.bind(null, data)
          ], function (err) {
            if (err) {
              cb(err)
            } else {
              cb()
            }
          })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to fetch subscriptions'
            logger.serverLog(message, `${TAG}: runSessionTimeOutScript`, {}, {query}, 'error')
          }
        })
      }
    })
    .catch((err) => {
      const message = err || 'Unable to fetch alert subscriptions'
      logger.serverLog(message, `${TAG}: exports.runSessionTimeOutScript`, {}, {}, 'error')
    })
}

const _isSessionTimedOut = (data, next) => {
  let subscription = data.subscription
  let query = {
    purpose: 'aggregate',
    sort: {_id: -1},
    limit: 1
  }
  if (subscription.platform === 'messenger') {
    query.match = {sender_fb_id: subscription.channelId, format: 'facebook', company_id: subscription.companyId}
  } else if (subscription.platform === 'whatsApp') {
    query.match = {senderNumber: subscription.channelId, format: 'whatsApp', companyId: subscription.companyId}
  }
  utility.callApi(`${data.url}/query`, 'post', query, 'kibochat')
    .then(lastMessage => {
      if (lastMessage.length > 0) {
        lastMessage = lastMessage[0]
        if (moment().diff(moment(lastMessage.datetime), 'hours') >= 23) {
          data.isSessionTimedOut = true
          data.lastMessageBySubscriber = lastMessage
        }
        next()
      } else {
        next()
      }
    })
    .catch((err) => {
      next(err)
    })
}
const _shouldSendMessage = (data, next) => {
  if (data.isSessionTimedOut) {
    let subscription = data.subscription
    let query = {
      purpose: 'aggregate',
      match: {
        _id: {$gt: data.lastMessageBySubscriber._id},
        format: 'convos',
        'payload.componentType': 'text',
        'payload.text': {$regex: `^\\The alert session has been timed out.`}
      }
    }
    if (subscription.platform === 'messenger') {
      query.match['sender_id'] = data.lastMessageBySubscriber.recipient_id
      query.match['company_id'] = subscription.companyId
    } else if (subscription.platform === 'whatsApp') {
      query.match['senderNumber'] = data.lastMessageBySubscriber.recipientNumber
      query.match['companyId'] = subscription.companyId
    }
    utility.callApi(`${data.url}/query`, 'post', query, 'kibochat')
      .then(messages => {
        if (messages.length <= 0) {
          data.shouldSendMessage = true
        }
        next()
      })
      .catch((err) => {
        next(err)
      })
  } else {
    next()
  }
}
const _sendMessage = (data, next) => {
  if (data.shouldSendMessage) {
    data.notificationMessage = 'The alert session has been timed out. If you wish to continue receiving alerts from us, please reply to this message to reactivate the session.'
    if (data.subscription.platform === 'messenger') {
      _sendMessageOnMessenger(data)
    } else if (data.subscription.platform === 'whatsApp') {
      _sendMessageOnWhatsApp(data)
    }
    next()
  } else {
    next()
  }
}
const _sendMessageOnWhatsApp = (data) => {
  utility.callApi(`companyProfile/query`, 'post', { _id: data.subscription.companyId })
    .then(companyProfile => {
      if (companyProfile.whatsApp) {
        let response = {
          whatsApp: {
            accessToken: companyProfile.whatsApp.accessToken,
            accountSID: companyProfile.whatsApp.accountSID,
            businessNumber: companyProfile.whatsApp.businessNumber
          },
          recipientNumber: data.subscription.channelId,
          payload: { componentType: 'text', text: data.notificationMessage }
        }
        whatsAppMapper.whatsAppMapper(companyProfile.whatsApp.provider, ActionTypes.SEND_CHAT_MESSAGE, response)
          .then(sent => {
            utility.callApi(`whatsAppContacts/query`, 'post', { number: data.subscription.channelId, companyId: companyProfile._id })
              .then((contact) => {
                if (contact.length > 0) {
                  contact = contact[0]
                  storeChat(companyProfile.whatsApp.businessNumber, contact.number, contact, response.payload, 'convos')
                }
              })
              .catch((err) => {
                const message = err || 'Unable to fetch contact'
                logger.serverLog(message, `${TAG}: _sendMessageOnWhatsApp`, {}, {data}, 'error')
              })
          })
          .catch(err => {
            const message = err || 'Unable to send message'
            logger.serverLog(message, `${TAG}: _sendMessageOnWhatsApp`, {}, {data}, 'error')
          })
      }
    })
    .catch((err) => {
      const message = err || 'Unable to fetch company profile'
      logger.serverLog(message, `${TAG}: _sendMessageOnWhatsApp`, {}, {data}, 'error')
    })
}
function _sendMessageOnMessenger (data, next) {
  utility.callApi(`pages/query`, 'post', { _id: data.lastMessageBySubscriber.recipient_id })
    .then(page => {
      if (page.length > 0) {
        facebookApiCaller('v6.0', `me/messages?access_token=${page[0].accessToken}`, 'post', {
          messaging_type: 'RESPONSE',
          recipient: JSON.stringify({ id: data.subscription.channelId }),
          message: {
            text: data.notificationMessage,
            'metadata': 'This is a meta data'
          }
        }).then(response => {
          if (response.body && response.body.error) {
            let err = response.body.error
            const message = err || 'Unable to send message to messenger'
            logger.serverLog(message, `${TAG}: _sendMessageOnMessenger`, {}, {data},
              err.error_subcode && err.code && err.error_subcode === 2018278 && err.code === 10 ? 'info' : 'error')
          }
        })
          .catch(err => {
            const message = err || 'Unable to send message'
            logger.serverLog(message, `${TAG}: _sendMessageOnMessenger`, {}, {data}, 'error')
          })
      }
    })
    .catch((err) => {
      const message = err || 'Unable to fetch page'
      logger.serverLog(message, `${TAG}: _sendMessageOnMessenger`, {}, {data}, 'error')
    })
}
