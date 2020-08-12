const logicLayer = require('./whatsAppChatbot.logiclayer')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const { createBulkMessageBlocks } = require('../messageBlock/messageBlock.datalayer')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.controller.js'

exports.create = async (req, res) => {
  try {
    let existingChatbot = await fetchWhatsAppChatbot(req)
    if (existingChatbot) {
      sendErrorResponse(res, 500, existingChatbot, `Chatbot already exists`)
    } else {
      let newChatbot = await createWhatsAppChatbot(req)
      let messageBlocks = logicLayer.getMainMenuBlocks(newChatbot._id, req.user._id, req.user.companyId)
      newChatbot = await updateWhatsAppChatbot(req, {
        startingBlockId: messageBlocks[0].uniqueId
      })
      await createBulkMessageBlocks(messageBlocks)
      sendSuccessResponse(res, 200, newChatbot, 'WhatsApp chatbot created successfully')
    }
  } catch (err) {
    sendErrorResponse(res, 500, err, `Failed to create WhatsApp chatbot`)
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
    sendErrorResponse(res, 500, err, `Failed to fetch WhatsApp chatbot`)
  }
}

exports.update = async (req, res) => {
  try {
    let updatedChatbot = await updateWhatsAppChatbot(req, req.body)
    sendSuccessResponse(res, 200, updatedChatbot, 'WhatsApp chatbot updated successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err, `Failed to update WhatsApp chatbot`)
  }
}

const createWhatsAppChatbot = (req) => {
  return new Promise(async (resolve, reject) => {
    try {
      let createdChatbot = await callApi(`whatsAppChatbot`, 'post', {
        userId: req.user._id,
        companyId: req.user.companyId
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
      let updatedChatbot = await callApi('whatsAppChatbot', 'patch', {
        purpose: 'updateOne',
        match: {
          companyId: req.user.companyId
        },
        updated
      }, 'kibochat')
      updatedChatbot = { ...updatedChatbot, ...updated }
      resolve(updatedChatbot)
    } catch (err) {
      logger.serverLog(TAG, `Failed to update whatsapp chatbot ${err}`, 'error')
      reject(err)
    }
  })
}
