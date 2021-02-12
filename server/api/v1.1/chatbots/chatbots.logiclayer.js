const { callApi } = require('../utility')
const { sendNotifications } = require('../../global/sendNotification')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'

exports.sendNotification = async (subscriber, message, companyId) => {
  try {
    let title = 'Customer Support Agent Request'
    let newPayload = {
      action: 'chat_messenger',
      subscriber
    }
    const companyUsers = await callApi(`companyUser/queryAll`, 'post', { companyId: companyId }, 'accounts')
    sendNotifications(title, message, newPayload, companyUsers)
    saveNotifications(subscriber, message, companyUsers)
  } catch (err) {
    const message = err || 'Failed to send talk to agent notification'
    logger.serverLog(message, `${TAG}: exports.sendTalkToAgentNotification`, {}, { subscriber, companyId }, 'error')
  }
}

function saveNotifications (subscriber, message, companyUsers) {
  try {
    companyUsers.forEach(async (companyUser, index) => {
      let notificationsData = {
        message: message,
        category: { type: 'new_message', id: subscriber._id },
        agentId: companyUser.userId._id,
        companyId: companyUser.companyId,
        platform: 'messenger'
      }
      await callApi(`notifications`, 'post', notificationsData, 'kibochat')
      notificationsData.muteNotification = false
      notificationsData.subscriber = subscriber
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
    logger.serverLog(message, `${TAG}: saveNotifications`, {}, { subscriber, message, companyUsers }, 'error')
  }
}

exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    companyId: companyId,
    userId: userId,
    type: 'manual',
    ...body
  }
  return payload
}

exports.prepareIdsArray = function (payload) {
  let ids = []
  for (let i = 0; i < payload.length; i++) {
    ids.push(payload[i]._id)
  }
  return ids
}

exports.populatePageIdsInChatBots = function (pages, chatbots) {
  return chatbots.map((bot) => {
    bot.pageId = pages.filter(page => page._id === bot.pageId)[0]
  })
}

exports.chatbotBackupPayload = function (chatbot, blocks) {
  const startingBlock = blocks.find((item) => item._id === chatbot.startingBlockId)
  const payload = {
    chatbotId: chatbot._id,
    pageId: chatbot.pageId,
    companyId: chatbot.companyId,
    userId: chatbot.userId,
    datetime: new Date(),
    triggers: chatbot.triggers,
    startingBlockId: startingBlock.uniqueId
  }
  return payload
}

exports.blockBackupPayload = function (block) {
  const payload = {
    module: block.module,
    blockId: block._id,
    companyId: block.companyId,
    userId: block.userId,
    blockUniqueId: block.uniqueId,
    title: block.title,
    payload: block.payload,
    datetime: new Date()
  }
  return payload
}

exports.chatbotPayload = function (backup, startingBlock) {
  const payload = {
    triggers: backup.triggers,
    startingBlockId: startingBlock._id
  }
  return payload
}

exports.blockPayload = function (backup) {
  const payload = {
    module: backup.module,
    uniqueId: backup.blockUniqueId,
    payload: backup.payload,
    userId: backup.userId,
    companyId: backup.companyId,
    title: backup.title,
    datetime: backup.datetime
  }
  return payload
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
    'urlBtnClickedCount': {
      '$sum': '$urlBtnClickedCount'
    },
    'returningSubscribers': {
      '$sum': '$returningSubscribers'
    }
  }
  return groupCriteria
}
