// const logicLayer = require('./whatsAppChatbot.logiclayer')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppChatbot/whatsAppChatbot.controller.js'

exports.create = async (req, res) => {
  try {
    let existingChatbot = await fetchWhatsAppChatbot(req)
    if (existingChatbot) {
      sendErrorResponse(res, 500, existingChatbot, `Chatbot already exists`)
    } else {
      let newChatbot = await createWhatsAppChatbot(req)
      sendSuccessResponse(res, 200, newChatbot, 'WhatsApp chatbot created successfully')
    }
  } catch (err) {
    sendErrorResponse(res, 500, err, `Failed to create WhatsApp chatbot`)
  }
}

exports.fetch = async (req, res) => {
  try {
    let chatbot = await fetchWhatsAppChatbot(req)
    sendSuccessResponse(res, 200, chatbot, 'WhatsApp chatbot fetched successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err, `Failed to fetch WhatsApp chatbot`)
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
