const { callApi } = require('../utility')
const { sendNotifications } = require('../../global/sendNotification')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'

exports.sendNotification = async (contact, message, companyId) => {
  try {
    let title = 'Customer Support Agent Request'
    let newPayload = {
      action: 'chat_whatsapp',
      subscriber: contact
    }
    const companyUsers = await callApi(`companyUser/queryAll`, 'post', { companyId: companyId }, 'accounts')
    sendNotifications(title, message, newPayload, companyUsers)
    saveNotifications(contact, message, companyUsers)
  } catch (err) {
    const message = err || 'Failed to send talk to agent notification'
    logger.serverLog(message, `${TAG}: exports.sendTalkToAgentNotification`, {}, { contact, companyId }, 'error')
  }
}

function saveNotifications (contact, message, companyUsers) {
  try {
    companyUsers.forEach(async (companyUser, index) => {
      let notificationsData = {
        message: message,
        category: { type: 'new_message', id: contact._id },
        agentId: companyUser.userId._id,
        companyId: companyUser.companyId,
        platform: 'whatsApp'
      }
      await callApi(`notifications`, 'post', notificationsData, 'kibochat')
      require('./../../../config/socketio').sendMessageToClient({
        room_id: companyUser.companyId,
        body: {
          action: 'new_notification',
          payload: notificationsData
        }
      })
    })
  } catch (err) {
    const message = err || 'Failed to save talk to agent notification'
    logger.serverLog(message, `${TAG}: saveNotifications`, {}, { contact, message, companyUsers }, 'error')
  }
}

exports.criteriaForPeriodicBotStats = (chatbotId, days) => {
  let matchAggregate = {
    chatbotId: chatbotId,
    'dateToday': {
      $gte: new Date(
        (new Date() - (days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date()))
    }
  }
  return matchAggregate
}

exports.criteriaForPeriodicBotStatsForGroup = () => {
  let groupCriteria = {
    '_id': '$chatbotId',
    'sentCount': {
      '$sum': '$sentCount'
    },
    'triggerWordsMatched': {
      '$sum': '$triggerWordsMatched'
    },
    'newSubscribersCount': {
      '$sum': '$newSubscribersCount'
    },
    'returningSubscribers': {
      '$sum': '$returningSubscribers'
    }
  }
  return groupCriteria
}

// NOTE: This is temporary function only for Adil testing
exports.getChatbotsListMessageBlock = (chatbots) => {
  let messageBlock = {
    module: {
      id: 'sojharo-s-chatbot-custom-id',
      type: 'whatsapp_chatbot'
    },
    title: 'Select Bot',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: `Please select the desired chatbot from following: \n`,
        componentType: 'text',
        menu: []
      }
    ],
    userId: 'chatbot.userId', // written this way on purpose, this is testing thing - sojharo
    companyId: 'chatbot.companyId'
  }

  for (let i = 0; i < chatbots.length; i++) {
    const chatbot = chatbots[i]
    messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${chatbot.title} `
    messageBlock.payload[0].menu.push({ botId: chatbot.botId, title: chatbot.title, built: chatbot.built })
  }
  return messageBlock
}

// NOTE: This is temporary function only for Adil testing
exports.getChatbotSelectedMessageBlock = (botName) => {
  let messageBlock = {
    module: {
      id: 'sojharo-s-chatbot-custom-id-selected-bot',
      type: 'whatsapp_chatbot'
    },
    title: 'Selected Bot',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: `Successfully switched to the bot ${botName}. Please say hi to start chatting with this bot`,
        componentType: 'text',
        menu: []
      }
    ],
    userId: 'chatbot.userId', // written this way on purpose, this is testing thing - sojharo
    companyId: 'chatbot.companyId'
  }
  return messageBlock
}

function convertToEmoji (num) {
  let stringNum = num + ''
  const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
  let emoji = ''
  for (let i = 0; i < stringNum.length; i++) {
    emoji += numbers[parseInt(stringNum.charAt(i))]
  }
  return emoji
}

exports.convertToEmoji = convertToEmoji
