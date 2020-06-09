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
  let tickets = []
  let deviceNotRegistered = [];
  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        logger.serverLog(TAG, `ticketChunk ${JSON.stringify(ticketChunk)}`)
        tickets.push(...ticketChunk)
        for (let ticket of ticketChunk) {
          if (ticket.status === 'error') {
            logger.serverLog(`Error while sending notification ${util.inspect(ticket.details.error)}`)
            if (ticket.details.error === 'DeviceNotRegistered') {
              let token = ticket.message.split('"')
              deviceNotRegistered.push(token[1])
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
              utility.callApi('companyUser/update', 'post', {query: {userId: user._id}, newPayload: {expoListToken: expoListToken}, options: {}})
                .then(updated => {
                  logger.serverLog(TAG, `Update successfully expoList token in Company Table`)
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to update expo token in Company Table ${util.inspect(err)}`, 'error')
                })
            }).catch(error => {
              logger.serverLog(TAG, `Error while fetching companyUser details ${util.inspect(error)}`, 'error')
            })            
        }
      } catch (error) {
        logger.serverLog(`Error while sending notification ${util.inspect(error)}`)
      }
    }
  })();
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
