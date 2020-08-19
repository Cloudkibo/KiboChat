const logicLayer = require('./whatsAppChatbot.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const dataLayer = require('./whatsAppChatbot.datalayer')

exports.create = async (req, res) => {
  try {
    console.log('create whatsapp chatbot', req.body)
    let existingChatbot = await dataLayer.fetchWhatsAppChatbot(req.user.companyId)
    if (existingChatbot) {
      sendErrorResponse(res, 500, existingChatbot, `Chatbot already exists`)
    } else {
      let chatbot = await dataLayer.createWhatsAppChatbot(req)
      let messageBlocks = logicLayer.getMessageBlocks(chatbot._id, req.user._id, req.user.companyId)
      chatbot = await dataLayer.updateWhatsAppChatbot(req, {
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
    let chatbot = await dataLayer.fetchWhatsAppChatbot(req.user.companyId)
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
    let updatedChatbot = await dataLayer.updateWhatsAppChatbot(req, req.body)
    sendSuccessResponse(res, 200, updatedChatbot, 'WhatsApp chatbot updated successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to update WhatsApp chatbot`)
  }
}

exports.getChatbotDetails = async (req, res) => {
  try {
    let chatbot = await dataLayer.fetchWhatsAppChatbot(req.user.companyId)
    let messageBlocks = await messageBlockDataLayer.findAllMessageBlock({ 'module.id': chatbot._id, 'module.type': 'whatsapp_chatbot' })
    sendSuccessResponse(res, 200, { chatbot, messageBlocks }, 'WhatsApp chatbot details fetched successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to fetch WhatsApp chatbot details`)
  }
}
