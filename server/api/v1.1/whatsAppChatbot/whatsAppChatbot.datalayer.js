const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.datalayer.js'

exports.createWhatsAppChatbot = (req) => {
  return new Promise(async (resolve, reject) => {
    try {
      let createdChatbot = await callApi(`whatsAppChatbot`, 'post', {
        userId: req.user._id,
        companyId: req.user.companyId,
        botLinks: req.body.botLinks ? req.body.botLinks : undefined,
        testSubscribers: req.body.testSubscribers ? req.body.testSubscribers : [],
        storeType: req.body.storeType
      }, 'kibochat')
      resolve(createdChatbot)
    } catch (err) {
      const message = err || 'Failed to create whatsapp chatbot'
      logger.serverLog(message, `${TAG}: exports.createWhatsAppChatbot`, {}, {}, 'error')
      reject(err)
    }
  })
}

exports.fetchWhatsAppChatbot = (match) => {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbot = await callApi('whatsAppChatbot/query', 'post', {
        purpose: 'findOne',
        match: match
      }, 'kibochat')
      resolve(chatbot)
    } catch (err) {
      const message = err || 'Failed to fetch whatsapp chatbot'
      logger.serverLog(message, `${TAG}: exports.fetchWhatsAppChatbot`, {}, {}, 'error')
      reject(err)
    }
  })
}

exports.updateWhatsAppChatbot = (companyId, updated) => {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbot = await callApi('whatsAppChatbot', 'put', {
        purpose: 'updateOne',
        match: {
          companyId: companyId
        },
        updated
      }, 'kibochat')
      chatbot = { ...chatbot, ...updated }
      resolve(chatbot)
    } catch (err) {
      const message = err || 'Failed to update whatsapp chatbot'
      logger.serverLog(message, `${TAG}: exports.updateWhatsAppChatbot`, {}, {}, 'error')
      reject(err)
    }
  })
}

exports.deleteForChatBot = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`whatsAppChatbot`, 'delete', query, 'kibochat')
}
