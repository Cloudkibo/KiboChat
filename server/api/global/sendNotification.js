const { Expo } = require('expo-server-sdk')
const logger = require('../../../components/logger')
const util = require('util')
const utility = require('../utility')
const sendNotifications = (expoListToken, bodyMessage, data, userId) => {
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
    data: data
  })
  let chunks = expo.chunkPushNotifications(messages)
  let tickets = []
  let deviceNotRegistered = []
  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        console.log(ticketChunk)
        tickets.push(...ticketChunk)
        for (let ticket of ticketChunk.data) {
          if (ticket.status === 'error') {
            logger.serverLog(`Error while sending notification ${util.inspect(ticket.details.error)}`)
            if (ticket.details.error === 'DeviceNotRegistered') {
              let token = ticket.message.split('"')
              deviceNotRegistered.push(token[1])
            }
          }
        }
        if (deviceNotRegistered.length > 0) {
            
        }
      } catch (error) {
        logger.serverLog(`Error while sending notification ${util.inspect(error)}`)
      }
    }
  })()
}