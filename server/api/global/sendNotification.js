const { Expo } = require('expo-server-sdk')
const logger = require('../../components/logger')
const utility = require('../v1.1/utility')
const TAG = 'api/global/sendNotification.js'

const sendMobileNotifications = (expoListToken, title, bodyMessage, data, user, maxSendCount) => {
  let expo = new Expo()
  expoListToken = expoListToken.filter(expoToken => {
    if (Expo.isExpoPushToken(expoToken)) {
      return expoToken
    }
  })
  let messages = []
  messages.push({
    to: expoListToken,
    sound: 'default',
    body: bodyMessage,
    data: data,
    title: title
  })
  let chunks = expo.chunkPushNotifications(messages)
  let tickets = []
  let deviceNotRegistered = [];
  (async () => {
    let maxLengthChunck = 0
    for (let [indexChunk, chunk] of chunks.entries()) {
      try {
        if (indexChunk === 0) {
          maxLengthChunck = chunk.length
        }
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        tickets.push(...ticketChunk)
        for (let indexTicket = 0; indexTicket < ticketChunk.length; indexTicket++) {
          if (ticketChunk[indexTicket].status === 'error') {
            if (ticketChunk[indexTicket].details.error === 'DeviceNotRegistered') {
              deviceNotRegistered.push(expoListToken[(indexChunk * maxLengthChunck) + indexTicket])
            }
          }
        }
        if (deviceNotRegistered.length > 0) {
          utility.callApi(`companyUser/query`, 'post', {userId: user._id})
            .then(companyUser => {
              let expoListToken = companyUser.expoListToken
              expoListToken = expoListToken.filter(expoToken => {
                if (!deviceNotRegistered.includes(expoToken)) {
                  return expoToken
                }
              })
              utility.callApi('companyUser/update', 'put', {query: {userId: user._id}, newPayload: {expoListToken: expoListToken}, options: {}})
                .then(updated => {
                })
                .catch(err => {
                  const message = err || 'Failed to update expo token in Company Table'
                  return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, {expoListToken, title, bodyMessage, data, user}, 'error')
                })
            }).catch(error => {
              const message = error || 'Error while fetching companyUser details'
              return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, {expoListToken, title, bodyMessage, data, user}, 'error')
            })
        }
      } catch (error) {
        const message = error || 'Error while sending notification'
        if (maxSendCount > 0 && message && (!message.code || message.code === 504 || message.code === 502)) {
          logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, {expoListToken, title, bodyMessage, data, user}, 'info')
          sendMobileNotifications(expoListToken, title, bodyMessage, data, user, maxSendCount - 1)
        } else if (message && message.code !== 'PUSH_TOO_MANY_EXPERIENCE_IDS') {
          return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, {expoListToken, title, bodyMessage, data, user}, 'error')
        }
      }
    }
  })()
}

function sendNotifications (title, body, payload, companyUsers) {
  for (let i = 0; i < companyUsers.length; i++) {
    let expoListToken = companyUsers[i].expoListToken
    if (expoListToken.length > 0) {
      if (!body) {
        body = 'Sent an Attachment'
      }
      sendMobileNotifications(expoListToken, title, body, payload, companyUsers[i].userId, 3)
    }
  }
}

exports.sendNotifications = sendNotifications
