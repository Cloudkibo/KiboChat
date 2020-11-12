const { Expo } = require('expo-server-sdk')
const logger = require('../../components/logger')
const util = require('util')
const utility = require('../v1.1/utility')
const TAG = 'api/global/sendNotification.js'

const sendMobileNotifications = (expoListToken, title, bodyMessage, data, user) => {
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
  console.log('chunks got', chunks)
  // for (let [index_chunk, chunk] of chunks.entries()) {
  //   console.log('index_chunk', index_chunk)
  //   console.log('chunk inside', chunk)
  // }
  let tickets = []
  let deviceNotRegistered = [];
  (async () => {
    let maxLengthChunck = 0
    for (let [indexChunk, chunk] of chunks.entries()) {
      console.log('indexChunk', indexChunk)
      console.log('chunk', chunk)
      try {
        if (indexChunk === 0) {
          maxLengthChunck = chunk.length
        }
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        console.log('ticketChunk', ticketChunk)
        tickets.push(...ticketChunk)
        console.log('tickets', tickets)
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
                  return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, expoListToken, 'error')
                })
            }).catch(error => {
              const message = error || 'Error while fetching companyUser details'
              return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, expoListToken, 'error')
            })
        }
      } catch (error) {
        const message = error || 'Error while sending notification'
        return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, expoListToken, 'error')
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
      sendMobileNotifications(expoListToken, title, body, payload, companyUsers[i].userId)
    }
  }
}

exports.sendNotifications = sendNotifications
