const logicLayer = require('./whatsAppChatbot.logiclayer')
const commerceChatbotLogicLayer = require('./commerceChatbot.logiclayer')
const airlinesChatbotLogicLayer = require('./airlinesChatbot.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const dataLayer = require('./whatsAppChatbot.datalayer')
const analyticsDataLayer = require('./whatsAppChatbot_analytics.datalayer')
const utility = require('../utility/index.js')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/whatsAppChatbot/whatsAppChatbot.controller'

exports.create = async (req, res) => {
  try {
    let existingChatbot = await dataLayer.fetchWhatsAppChatbot({ companyId: req.user.companyId, vertical: req.body.vertical })
    if (existingChatbot && req.user.companyId !== '5a89ecdaf6b0460c552bf7fe') {
      // About the above company condition
      // This is a demo requirement by Sir and not unnecessary hard coding
      // Please don't remove this until discussed with Sir. We are just allowing
      // CloudKibo company to have multiple whatsapp chatbots per company for
      // demo purposes. Other companies can only have one whatsapp chatbot.
      // - Sojharo
      sendErrorResponse(res, 400, existingChatbot, `Chatbot already exists`)
    } else {
      let chatbot = await dataLayer.createWhatsAppChatbot(req)
      updateCompanyProfileForChatbot(req.user.companyId, chatbot._id)
      let messageBlocks = null
      if (req.body.vertical === 'commerce') {
        messageBlocks = commerceChatbotLogicLayer.getMessageBlocks(chatbot)
      } else if (req.body.vertical === 'airlines') {
        messageBlocks = airlinesChatbotLogicLayer.getMessageBlocks(chatbot)
      }
      console.log('messageBlocks created', messageBlocks)
      if (messageBlocks) {
        chatbot = await dataLayer.updateWhatsAppChatbot({_id: chatbot._id}, {
          startingBlockId: messageBlocks[0].uniqueId
        })
        messageBlockDataLayer.createBulkMessageBlocks(messageBlocks)
      }
      sendSuccessResponse(res, 200, chatbot, 'WhatsApp chatbot created successfully')
    }
  } catch (err) {
    const message = err || 'Failed to create WhatsApp chatbot'
    logger.serverLog(message, `${TAG}: exports.create`, req.body, { user: req.user }, 'error')
    sendErrorResponse(res, 500, err.message, `Failed to create WhatsApp chatbot`)
  }
}

exports.fetch = async (req, res) => {
  try {
    let chatbot = await dataLayer.fetchWhatsAppChatbot(req.body)
    if (chatbot) {
      sendSuccessResponse(res, 200, chatbot, 'WhatsApp chatbot fetched successfully')
    } else {
      sendErrorResponse(res, 400, chatbot, `No WhatsApp chatbot found`)
    }
  } catch (err) {
    const message = err || 'Failed to fetch WhatsApp chatbot'
    logger.serverLog(message, `${TAG}: exports.fetch`, {}, { user: req.user }, 'error')
    sendErrorResponse(res, 500, err.message, `Failed to fetch WhatsApp chatbot`)
  }
}

exports.update = async (req, res) => {
  try {
    let updatedChatbot = await dataLayer.updateWhatsAppChatbot(req.body.query, req.body.updated)
    sendSuccessResponse(res, 200, updatedChatbot, 'WhatsApp chatbot updated successfully')
    // if (req.body.botLinks && req.body.botLinks.faqs) {
    //   if (updatedChatbot.vertical === 'commerce') {
    //     commerceChatbotLogicLayer.updateFaqsForStartingBlock(updatedChatbot)
    //   } else if (this.updatedChatbot.vertical === 'airlines') {
    //     airlinesChatbotLogicLayer.updateFaqsForStartingBlock(updatedChatbot)
    //   }
    // }
  } catch (err) {
    const message = err || 'Failed to update WhatsApp chatbot'
    logger.serverLog(message, `${TAG}: exports.update`, req.body, { user: req.user }, 'error')
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
    const message = err || 'Failed to fetch analytics for chatbot'
    logger.serverLog(message, `${TAG}: exports.fetchAnalytics`, {}, { user: req.user, params: req.params }, 'error')
    sendErrorResponse(res, 500, 'Failed to fetch analytics for chatbot')
  }
}

function updateCompanyProfileForChatbot (companyId, chatbotId) {
  let payload = {
    query: { _id: companyId },
    newPayload: {
      'whatsApp.activeWhatsappBot': chatbotId
    },
    options: {
      upsert: false
    }
  }
  utility.callApi(`companyprofile/update`, 'put', payload, 'accounts')
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'Failed to update company'
      logger.serverLog(message, `${TAG}: exports.updateCompanyProfileForChatbot`, {}, { payload }, 'error')
    })
}
