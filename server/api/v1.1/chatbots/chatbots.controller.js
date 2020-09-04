const logiclayer = require('./chatbots.logiclayer')
const shopifyLogicLayer = require('./shopifyChatbot.logiclayer')
const datalayer = require('./chatbots.datalayer')
const analyticsDataLayer = require('./chatbots_analytics.datalayer')
const msgBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const chatbotAutomation = require('./../messengerEvents/chatbotAutomation.controller.js')
const urlDataLayer = require('./../messageBlock/url.datalayer.js')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { kibochat, kiboengage } = require('../../global/constants').serverConstants
const async = require('async')

exports.index = function (req, res) {
  callApi(`pages/query`, 'post', { companyId: req.user.companyId, connected: true })
    .then(pages => {
      let pageIds = logiclayer.prepareIdsArray(pages)
      datalayer.findAllChatBots({ pageId: { $in: pageIds } })
        .then(chatbots => {
          logiclayer.populatePageIdsInChatBots(pages, chatbots)
          return sendSuccessResponse(res, 200, chatbots, null)
        })
        .catch(error => {
          return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbots.')
        })
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch the pages.')
    })
}

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.createForChatBot(payload)
    .then(chatbot => {
      _sendToClientUsingSocket(chatbot)
      return sendSuccessResponse(res, 201, chatbot, null)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to create the chatbot.')
    })
}

exports.update = function (req, res) {
  let dataToUpdate = {
    published: req.body.published,
    fallbackReply: req.body.fallbackReply,
    fallbackReplyEnabled: req.body.fallbackReplyEnabled,
    isYoutubePlayable: req.body.isYoutubePlayable
  }
  datalayer.genericUpdateChatBot({ _id: req.body.chatbotId }, dataToUpdate)
    .then(chatbotUpdated => {
      return sendSuccessResponse(res, 200, chatbotUpdated, 'Updated the chatbot publish status')
    })
    .catch(error => {
      sendErrorResponse(res, 500, error, `Failed to update chatbot ${JSON.stringify(error)}`)
    })
}

exports.details = function (req, res) {
  msgBlockDataLayer.findAllMessageBlock({ 'module.type': 'chatbot', 'module.id': req.params.id })
    .then(messageBlocks => {
      return sendSuccessResponse(res, 200, messageBlocks, null)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbot details.')
    })
}

exports.stats = (req, res) => {
  // function stub goes here
  const criteria = logiclayer.criteriaForPeriodicBotStats(req.params.id, req.params.n)
  const groupCriteria = logiclayer.criteriaForPeriodicBotStatsForGroup()
  analyticsDataLayer.aggregateForBotAnalytics(criteria, groupCriteria)
    .then(analytics => {
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
    })
    .catch(error => {
      logger.serverLog(TAG, error, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch analytics for chatbot')
    })
}

exports.fetchChatbot = function (req, res) {
  callApi('chatbots/query', 'post', { purpose: 'findOne', match: { _id: req.params.id } }, kibochat)
    .then(chatbot => {
      sendSuccessResponse(res, 200, chatbot)
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch chatbot')
    })
}

function _sendToClientUsingSocket (body) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'chatbots_newCreated',
      payload: {
        chatbot: body
      }
    }
  })
}

exports.delete = function (req, res) {
  datalayer.deleteForChatBot({ _id: req.params.id })
    .then(chatbot => {
      return res.status(201).json({ status: 'success', payload: chatbot })
    })
    .catch(error => {
      return res.status(500).json({ status: 'failed', payload: `Failed to delete chatbot ${error}` })
    })
}

exports.fetchBackup = function (req, res) {
  callApi(`chatbots_backup/query`, 'post', { purpose: 'findOne', match: { chatbotId: req.params.id } }, kibochat)
    .then(backup => {
      sendSuccessResponse(res, 200, backup)
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch backup')
    })
}

exports.createBackup = function (req, res) {
  const { chatbotId } = req.body
  const fetchChatbot = callApi(
    `chatbots/query`,
    'post',
    { purpose: 'findOne', match: { _id: chatbotId } },
    kibochat
  )
  const fetchBlocks = callApi(
    `messageBlocks/query`,
    'post',
    { purpose: 'findAll', match: { 'module.id': chatbotId, 'module.type': 'chatbot' } },
    kiboengage
  )
  const deleteBlocksBackup = callApi(
    `messageBlocks_backup`,
    'delete',
    { purpose: 'deleteMany', match: { 'module.id': chatbotId, 'module.type': 'chatbot' } },
    kibochat
  )
  Promise.all([fetchChatbot, fetchBlocks, deleteBlocksBackup])
    .then(results => {
      const chatbot = results[0]
      const blocks = results[1]
      const chatbotPayload = logiclayer.chatbotBackupPayload(chatbot, blocks)
      const createChatbotBackup = callApi(
        `chatbots_backup`,
        'put',
        { purpose: 'updateOne', match: { chatbotId }, updated: chatbotPayload, upsert: true },
        kibochat
      )
      const backupCalls = [createChatbotBackup]
      async.each(blocks, function (block, cb) {
        let blockPayload = logiclayer.blockBackupPayload(block)
        backupCalls.push(
          callApi(
            `messageBlocks_backup`,
            'put',
            { purpose: 'updateOne', match: { blockId: block._id }, updated: blockPayload, upsert: true },
            kibochat
          )
        )
        cb()
      }, function (err) {
        if (err) {
          logger.serverLog(TAG, err, 'error')
          sendErrorResponse(res, 500, 'Failed to create backup')
        } else {
          Promise.all(backupCalls)
            .then(responses => {
              sendSuccessResponse(res, 200, 'Backup created successfully')
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
              sendErrorResponse(res, 500, 'Failed to create backup')
            })
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to create backup')
    })
}

exports.restoreBackup = function (req, res) {
  const { chatbotId } = req.body
  const deleteBlocks = callApi(
    `messageBlocks`,
    'delete',
    { purpose: 'deleteMany', match: { 'module.id': chatbotId, 'module.type': 'chatbot' } },
    kiboengage
  )
  const fetchChatbotBackup = callApi(
    `chatbots_backup/query`,
    'post',
    { purpose: 'findOne', match: { chatbotId } },
    kibochat
  )
  const fetchBlocksBackup = callApi(
    `messageBlocks_backup/query`,
    'post',
    { purpose: 'findAll', match: { 'module.id': chatbotId, 'module.type': 'chatbot' } },
    kibochat
  )
  Promise.all([deleteBlocks, fetchChatbotBackup, fetchBlocksBackup])
    .then(results => {
      const chatbotBackup = results[1]
      const blocksBackup = results[2]
      const backupCalls = []
      async.each(blocksBackup, function (block, cb) {
        let blockPayload = logiclayer.blockPayload(block)
        backupCalls.push(
          callApi(
            `messageBlocks`,
            'post',
            blockPayload,
            kiboengage
          )
        )
        cb()
      }, function (err) {
        if (err) {
          logger.serverLog(TAG, err, 'error')
          sendErrorResponse(res, 500, 'Failed to restore backup')
        } else {
          Promise.all(backupCalls)
            .then(responses => {
              callApi('messageBlocks/query', 'post', { purpose: 'findOne', match: { uniqueId: chatbotBackup.startingBlockId } }, kiboengage)
                .then(startingBlock => {
                  const chatbotPayload = logiclayer.chatbotPayload(chatbotBackup, startingBlock)
                  callApi(`chatbots`, 'put', { purpose: 'updateOne', match: { _id: chatbotId }, updated: chatbotPayload }, kibochat)
                    .then(updated => {
                      sendSuccessResponse(res, 200, 'Backup restored successfully')
                    })
                    .catch(err => {
                      logger.serverLog(TAG, err, 'error')
                      sendErrorResponse(res, 500, 'Failed to restore backup')
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, err, 'error')
                  sendErrorResponse(res, 500, 'Failed to restore backup')
                })
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
              sendErrorResponse(res, 500, 'Failed to restore backup')
            })
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to restore backup')
    })
}

exports.redirectToUrl = (req, res) => {
  if (!req.headers['user-agent'].startsWith('facebook')) {
    logger.serverLog(TAG, `chatbot click count increased ${req.params.id}`, 'debug')
    urlDataLayer.findOneURL(req.params.id)
      .then(URLObject => {
        if (URLObject) {
          logger.serverLog(TAG, `URLObject found, incrementing click ${JSON.stringify(URLObject)}`, 'debug')
          msgBlockDataLayer.findOneMessageBlock({ uniqueId: URLObject.module.id })
            .then(msgBlockFound => {
              chatbotAutomation.updateBotLifeStatsForBlock(msgBlockFound, false)
              chatbotAutomation.updateBotPeriodicStatsForBlock(msgBlockFound.module.id, false)
              res.writeHead(301, { Location: URLObject.originalURL.startsWith('http') ? URLObject.originalURL : `https://${URLObject.originalURL}` })
              res.end()
            })
            .catch(err => {
              if (err) {
                sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
              }
            })
        } else {
          sendErrorResponse(res, 500, '', 'No URL found with id ' + req.params.id)
        }
      })
      .catch(err => {
        if (err) {
          sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
        }
      })
  }
}

exports.exportData = (req, res) => {
  const fetchmessageBlock = msgBlockDataLayer.findAllMessageBlock({ 'module.type': 'chatbot', 'module.id': req.body.chatBotId })
  const fetchAnalyticsBlock = analyticsDataLayer.findBotSubscribersAnalytics({ chatbotId: req.body.chatBotId })
  Promise.all([fetchmessageBlock, fetchAnalyticsBlock])
    .then(results => {
      let messageBlocks = results[0]
      let blockAnalytics = results[1]
      logger.serverLog(TAG, `blockAnalytics Length ${blockAnalytics.length}`)
      logger.serverLog(TAG, `messageBlocks Length ${messageBlocks.length}`)
      let blockAnalyticsData = []
      async.each(messageBlocks, function (messageBlock, cb) {
        let blockdata = {}
        let data = blockAnalytics.filter(block => block.messageBlockId === messageBlock._id)
        blockdata.chatBotName = req.body.pageName
        blockdata.blockName = messageBlock.title
        blockdata.subscriberClickCount = data.length
        blockAnalyticsData.push(blockdata)
        cb()
      }, function (err) {
        if (err) {
          logger.serverLog(TAG, err, 'error')
          sendErrorResponse(res, 500, `Failed to make data ${err}`)
        } else {
          sendSuccessResponse(res, 200, blockAnalyticsData)
        }
      }
      )
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbot details.')
    })
}

exports.createUpdateShopifyChatbot = async (req, res) => {
  try {
    let existingChatbot = await datalayer.findOneChatBot({
      companyId: req.user.companyId,
      pageId: req.body.pageId,
      type: 'automated',
      vertical: 'commerce'
    })
    if (existingChatbot) {
      await datalayer.genericUpdateChatBot({ companyId: req.user.companyId, pageId: req.body.pageId }, req.body)
      let updatedChatbot = { ...existingChatbot, ...req.body }
      shopifyLogicLayer.updateFaqsForStartingBlock(updatedChatbot)
      sendSuccessResponse(res, 200, updatedChatbot, 'Shopify chatbot updated successfully')
    } else {
      let chatbot = await datalayer.createForChatBot({
        pageId: req.body.pageId,
        companyId: req.user.companyId,
        userId: req.user._id,
        triggers: ['hi', 'hello'],
        type: 'automated',
        vertical: 'commerce',
        botLinks: req.body.botLinks
      })
      let messageBlocks = shopifyLogicLayer.getMessageBlocks(chatbot)
      await datalayer.genericUpdateChatBot({ companyId: req.user.companyId, pageId: req.body.pageId }, {
        startingBlockId: messageBlocks[0].uniqueId
      })
      chatbot.startingBlockId = messageBlocks[0].uniqueId
      sendSuccessResponse(res, 200, chatbot, 'Shopify chatbot created successfully')
    }
  } catch (err) {
    sendErrorResponse(res, 500, err ? err.message : `Failed to create Shopify chatbot`, `Failed to create Shopify chatbot`)
  }
}
