const logicLayer = require('./whatsAppChatbot.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const dataLayer = require('./whatsAppChatbot.datalayer')
const analyticsDataLayer = require('./whatsAppChatbot_analytics.datalayer')

exports.create = async (req, res) => {
  try {
    let existingChatbot = await dataLayer.fetchWhatsAppChatbot(req.user.companyId)
    if (existingChatbot) {
      sendErrorResponse(res, 500, existingChatbot, `Chatbot already exists`)
    } else {
      let chatbot = await dataLayer.createWhatsAppChatbot(req)
      let messageBlocks = logicLayer.getMessageBlocks(chatbot._id, req.user._id, req.user.companyId)
      chatbot = await dataLayer.updateWhatsAppChatbot(req.user.companyId, {
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
  try {
    let updatedChatbot = await dataLayer.updateWhatsAppChatbot(req.user.companyId, req.body)
    logicLayer.updateFaqsForStartingBlock(updatedChatbot)
    sendSuccessResponse(res, 200, updatedChatbot, 'WhatsApp chatbot updated successfully')
  } catch (err) {
    sendErrorResponse(res, 500, err.message, `Failed to update WhatsApp chatbot`)
  }
}

exports.fetchAnalytics = async (req, res) => {
  try {
    const criteria = logicLayer.criteriaForPeriodicBotStats(req.params.id, req.params.n)
    const groupCriteria = logicLayer.criteriaForPeriodicBotStatsForGroup()
    let analytics = await analyticsDataLayer.aggregateForBotAnalytics(criteria, groupCriteria)
    analytics = analytics[0]
    if (analytics) {
      return sendSuccessResponse(res, 200, {
        sentCount: analytics.sentCount,
        triggerWordsMatched: analytics.triggerWordsMatched,
        newSubscribers: analytics.newSubscribersCount,
        returningSubscribers: analytics.returningSubscribers,
        urlBtnClickedCount: analytics.urlBtnClickedCount
      }, null)
    } else {
      return sendSuccessResponse(res, 200, {
        sentCount: 0,
        triggerWordsMatched: 0,
        newSubscribers: 0,
        returningSubscribers: 0,
        urlBtnClickedCount: 0
      }, null)
    }
  } catch (err) {
    sendErrorResponse(res, 500, 'Failed to fetch analytics for chatbot')
  }
}
