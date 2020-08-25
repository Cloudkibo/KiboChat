const logicLayer = require('./whatsAppChatbot.logiclayer')
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
        testSubscribers: req.body.testSubscribers ? req.body.testSubscribers : []
      }, 'kibochat')
      resolve(createdChatbot)
    } catch (err) {
      logger.serverLog(TAG, `Failed to create whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}

exports.fetchWhatsAppChatbot = (companyId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbot = await callApi('whatsAppChatbot/query', 'post', {
        purpose: 'findOne',
        match: {
          companyId: companyId
        }
      }, 'kibochat')
      resolve(chatbot)
    } catch (err) {
      logger.serverLog(TAG, `Failed to fetch whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}

exports.updateWhatsAppChatbot = (companyId, updated) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (logicLayer.validateWhatsAppChatbotPayload(updated)) {
        let chatbot = await callApi('whatsAppChatbot', 'put', {
          purpose: 'updateOne',
          match: {
            companyId: companyId
          },
          updated
        }, 'kibochat')
        chatbot = { ...chatbot, ...updated }
        resolve(chatbot)
      } else {
        throw new Error('Invalid chatbot arguments')
      }
    } catch (err) {
      logger.serverLog(TAG, `Failed to update whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}
