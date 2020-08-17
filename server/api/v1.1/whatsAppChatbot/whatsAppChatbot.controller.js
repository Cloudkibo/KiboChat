const logicLayer = require('./whatsAppChatbot.logiclayer')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.controller.js'

exports.create = async (req, res) => {
  try {
    console.log('create whatsapp chatbot', req.body)
    let existingChatbot = await fetchWhatsAppChatbot(req)
    if (existingChatbot) {
      sendErrorResponse(res, 500, existingChatbot, `Chatbot already exists`)
    } else {
      let chatbot = await createWhatsAppChatbot(req)
      let messageBlocks = logicLayer.getMessageBlocks(chatbot._id, req.user._id, req.user.companyId)
      chatbot = await updateWhatsAppChatbot(req, {
        startingBlockId: messageBlocks[0].uniqueId
      })
      sendSuccessResponse(res, 200, chatbot, 'WhatsApp chatbot created successfully')
      await messageBlockDataLayer.createBulkMessageBlocks(messageBlocks)
    }
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to create WhatsApp chatbot`)
  }
}

exports.fetch = async (req, res) => {
  try {
    let chatbot = await fetchWhatsAppChatbot(req)
    if (chatbot) {
      sendSuccessResponse(res, 200, chatbot, 'WhatsApp chatbot fetched successfully')
    } else {
      sendErrorResponse(res, 500, chatbot, `No WhatsApp chatbot found`)
    }
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to fetch WhatsApp chatbot`)
  }
}

exports.update = async (req, res) => {
  console.log('update whatsapp chatbot', req.body)
  try {
    let updatedChatbot = await updateWhatsAppChatbot(req, req.body)
    sendSuccessResponse(res, 200, updatedChatbot, 'WhatsApp chatbot updated successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to update WhatsApp chatbot`)
  }
}

exports.getChatbotDetails = async (req, res) => {
  try {
    let chatbot = await fetchWhatsAppChatbot(req)
    let messageBlocks = await messageBlockDataLayer.findAllMessageBlock({ 'module.id': chatbot._id, 'module.type': 'whatsapp_chatbot' })
    sendSuccessResponse(res, 200, { chatbot, messageBlocks }, 'WhatsApp chatbot details fetched successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to fetch WhatsApp chatbot details`)
  }
}

const createWhatsAppChatbot = (req) => {
  return new Promise(async (resolve, reject) => {
    try {
      let createdChatbot = await callApi(`whatsAppChatbot`, 'post', {
        userId: req.user._id,
        companyId: req.user.companyId,
        botLinks: req.body.botLinks ? req.body.botLinks : undefined
      }, 'kibochat')
      resolve(createdChatbot)
    } catch (err) {
      logger.serverLog(TAG, `Failed to create whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}

const fetchWhatsAppChatbot = (req) => {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbot = await callApi('whatsAppChatbot/query', 'post', {
        purpose: 'findOne',
        match: {
          companyId: req.user.companyId
        }
      }, 'kibochat')
      resolve(chatbot)
    } catch (err) {
      logger.serverLog(TAG, `Failed to fetch whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}

const updateWhatsAppChatbot = (req, updated) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (logicLayer.validateWhatsAppChatbotPayload(req.body)) {
        let chatbot = await callApi('whatsAppChatbot', 'put', {
          purpose: 'updateOne',
          match: {
            companyId: req.user.companyId
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
