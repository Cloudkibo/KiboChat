const TAG = '/api/v1/messageAlerts/messageAlerts.utility.js'
const logger = require('../../../components/logger')
const utility = require('../utility')
const logicLayer = require('./messageAlerts.logiclayer')
const whatsAppMapper = require('../../../whatsAppMapper/whatsAppMapper')
const { ActionTypes } = require('../../../whatsAppMapper/constants')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const { storeChat } = require('../whatsAppEvents/controller')

exports.handleMessageAlertsSubscription = function (platform, subscriptionType, subscriber, data, provider) {
  handleSubscription(platform, subscriptionType, subscriber, data, provider)
}

function handleSubscription (platform, subscriptionType, subscriber, data, provider) {
  let query = {
    purpose: 'findOne',
    match: {
      companyId: subscriber.companyId,
      alertChannel: platform,
      platform: platform,
      channelId: platform === 'messenger' ? subscriber.senderId : subscriber.number}
  }
  utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscription => {
      if (subscriptionType === 'subscribe') {
        handleSubscribe(subscription, platform, subscriber, data, provider)
      } else {
        handleUnSubscribe(subscription, platform, subscriber, data, provider)
      }
    })
    .catch(error => {
      const message = error || 'error in fetching subscriptions'
      logger.serverLog(message, `${TAG}: exports.handleMessageAlertsSubscription`, {subscriber}, {platform, subscriptionType, subscriber, data, provider}, 'error')
    })
}

function handleSubscribe (subscription, platform, subscriber, data, provider) {
  if (!subscription) {
    let query = {
      purpose: 'findAll',
      match: {
        companyId: subscriber.companyId,
        alertChannel: platform,
        platform: platform
      },
      group: { _id: null, count: { $sum: 1 } }
    }
    utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
      .then(subscriptions => {
        if (subscriptions.length < 5) {
          let payload = logicLayer.getCreateSubscriptionPayload(platform, subscriber)
          utility.callApi(`alerts/subscriptions`, 'post', payload, 'kibochat')
            .then(subscriptionCreated => {
              require('../../../config/socketio').sendMessageToClient({
                room_id: subscriber.companyId,
                body: {
                  action: platform === 'whatsApp' ? 'whatsApp_messageAlert_subscription' : 'messenger_messageAlert_subscription',
                  payload: {
                    type: 'subscribed',
                    subscription: subscriptionCreated
                  }
                }
              })
              let message = `You have been subscribed successfully to receive alerts on ${platform}. If you want to unsubscribe, please send "cancel-notify"`
              if (platform === 'whatsApp') {
                sendResponseWhatsApp(data, subscriber, provider, message)
              } else {
                sendResponseMessenger(subscriber, data, message)
              }
            })
            .catch(error => {
              const message = error || 'error in creating subscription'
              logger.serverLog(message, `${TAG}: handleSubscribe`, {data}, {subscription, platform, subscriber, provider}, 'error')
            })
        }
      })
      .catch(error => {
        const message = error || 'error in fetching subscriptions'
        logger.serverLog(message, `${TAG}: exports.handleMessageAlertsSubscription`, {subscriber}, {platform, subscription, subscriber, data, provider}, 'error')
      })
  } else {
    let message = 'You are already subscribed. If you want to unsubscribe, please send "cancel-notify"'
    if (platform === 'whatsApp') {
      sendResponseWhatsApp(data, subscriber, provider, message)
    } else {
      sendResponseMessenger(subscriber, data, message)
    }
  }
}

function sendResponseMessenger (subscriber, page, message) {
  facebookApiCaller('v6.0', `me/messages?access_token=${page.accessToken}`, 'post', {
    messaging_type: 'RESPONSE',
    recipient: JSON.stringify({ id: subscriber.senderId }),
    message: {
      text: message,
      'metadata': 'This is a meta data'
    }
  }).then(response => {
    if (response.body && response.body.error) {
      const message = response.body.error || 'error in sending response'
      logger.serverLog(message, `${TAG}: sendResponseMessenger`, {}, {subscriber, page}, 'error')
    }
  })
    .catch(error => {
      const message = error || 'error in sending response'
      logger.serverLog(message, `${TAG}: sendResponseMessenger`, {}, {subscriber, page}, 'error')
    })
}
function sendResponseWhatsApp (data, contact, provider, text) {
  let response = {
    whatsApp: {
      accessToken: data.accessToken,
      accountSID: data.accountSID,
      businessNumber: data.businessNumber
    },
    recipientNumber: contact.number,
    payload: { componentType: 'text', text: text }
  }
  whatsAppMapper.whatsAppMapper(provider, ActionTypes.SEND_CHAT_MESSAGE, response)
    .then(sent => {
      storeChat(data.businessNumber, contact.number, contact, response.payload, 'convos')
    })
    .catch(err => {
      const message = err || 'Failed to send response'
      logger.serverLog(message, `${TAG}: sendResponseWhatsApp`, data, {contact, provider}, 'error')
    })
}
function handleUnSubscribe (subscription, platform, subscriber, data, provider) {
  if (subscription) {
    utility.callApi(`alerts/subscriptions`, 'delete', {
      purpose: 'deleteOne',
      match: {_id: subscription._id}
    }, 'kibochat')
      .then(deleted => {
        require('../../../config/socketio').sendMessageToClient({
          room_id: subscriber.companyId,
          body: {
            action: platform === 'whatsApp' ? 'whatsApp_messageAlert_subscription' : 'messenger_messageAlert_subscription',
            payload: {
              type: 'unsubscribed',
              subscription: subscription
            }
          }
        })
        let message = `You have successfully unsubscribed from receiving alerts via ${platform}. To subscribe back, just send "notify-me"`
        if (platform === 'whatsApp') {
          sendResponseWhatsApp(data, subscriber, provider, message)
        } else {
          sendResponseMessenger(subscriber, data, message)
        }
      })
      .catch(error => {
        const message = error || 'error in deleting subscription'
        logger.serverLog(message, `${TAG}: handleUnSubscribe`, {data}, {subscription, platform, subscriber, provider}, 'error')
      })
  } else {
    let message = 'You are already unsubscribed. If you want to subscribe, please send "notify-me"'
    if (platform === 'whatsApp') {
      sendResponseWhatsApp(data, subscriber, provider, message)
    } else {
      sendResponseMessenger(subscriber, data, message)
    }
  }
}
exports.optin = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let pageId = req.body.entry[0].messaging[0].recipient.id
  const senderId = req.body.entry[0].messaging[0].sender.id
  utility.callApi('pages/query', 'post', { pageId, connected: true })
    .then(page => {
      page = page[0]
      if (page) {
        utility.callApi('subscribers/query', 'post', {pageId: page._id, senderId: senderId, companyId: page.companyId})
          .then(subscriber => {
            if (subscriber.length > 0) {
              handleSubscription('messenger', 'subscribe', subscriber[0], page)
            }
          }).catch(error => {
            const message = error || 'Failed to fetch subscriber'
            logger.serverLog(message, `${TAG}: exports.optin`, req.body, {page}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'error on fetching page'
      logger.serverLog(message, `${TAG}: exports.optin`, req.body, {}, 'error')
    })
}
