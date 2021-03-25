const logiclayer = require('./chatbots.logiclayer')
const commerceLogicLayer = require('./commerceChatbot.logiclayer')
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
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const bigCommerceDataLayer = require('../bigcommerce/bigcommerce.datalayer')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')

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
          const message = error || 'Failed to fetch the chatbots'
          logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
          return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbots.')
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch the pages'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
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
      const message = error || 'Failed to create the chatbot'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to create the chatbot.')
    })
}

exports.update = function (req, res) {
  let dataToUpdate = {
    published: req.body.published,
    fallbackReply: req.body.fallbackReply,
    fallbackReplyEnabled: req.body.fallbackReplyEnabled,
    isYoutubePlayable: req.body.isYoutubePlayable,
    builderPreference: req.body.builderPreference
  }
  if (req.body.dialogFlowAgentId) {
    dataToUpdate.dialogFlowAgentId = req.body.dialogFlowAgentId
  }
  datalayer.genericUpdateChatBot({ _id: req.body.chatbotId }, dataToUpdate)
    .then(chatbotUpdated => {
      return sendSuccessResponse(res, 200, chatbotUpdated, 'Updated the chatbot publish status')
    })
    .catch(error => {
      const message = error || 'Failed to update the chatbot'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error, `Failed to update chatbot ${JSON.stringify(error)}`)
    })
}

exports.details = function (req, res) {
  msgBlockDataLayer.findAllMessageBlock({ 'module.type': 'chatbot', 'module.id': req.params.id })
    .then(messageBlocks => {
      return sendSuccessResponse(res, 200, messageBlocks, null)
    })
    .catch(error => {
      const message = error || 'Failed to fetch the chatbot details.'
      logger.serverLog(message, `${TAG}: exports.details`, {}, {user: req.user, params: req.params}, 'error')
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
      const message = error || 'error in chatbots controller stats'
      logger.serverLog(message, `${TAG}: exports.stats`, {}, { criteria, groupCriteria }, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch analytics for chatbot')
    })
}

exports.fetchChatbot = function (req, res) {
  callApi('chatbots/query', 'post', { purpose: 'findOne', match: { _id: req.params.id } }, kibochat)
    .then(chatbot => {
      sendSuccessResponse(res, 200, chatbot)
    })
    .catch(err => {
      const message = err || 'Failed to fetch chatbot'
      logger.serverLog(message, `${TAG}: exports.fetchChatbot`, {}, {user: req.user, params: req.params}, 'error')
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
      const message = error || 'Failed to delete chatbot'
      logger.serverLog(message, `${TAG}: exports.delete`, {}, {user: req.user, params: req.params}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to delete chatbot ${error}` })
    })
}

exports.fetchBackup = function (req, res) {
  callApi(`chatbots_backup/query`, 'post', { purpose: 'findOne', match: { chatbotId: req.params.id } }, kibochat)
    .then(backup => {
      sendSuccessResponse(res, 200, backup)
    })
    .catch(err => {
      const message = err || 'Failed to fetch backup'
      logger.serverLog(message, `${TAG}: exports.fetchBackup`, {}, {user: req.user, params: req.params}, 'error')
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
          const message = err || 'Failed to create backup'
          logger.serverLog(message, `${TAG}: exports.createChatBotBackup`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, 'Failed to create backup')
        } else {
          Promise.all(backupCalls)
            .then(responses => {
              sendSuccessResponse(res, 200, 'Backup created successfully')
            })
            .catch(err => {
              const message = err || 'Failed to create backup'
              logger.serverLog(message, `${TAG}: exports.createChatBotBackup`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, 'Failed to create backup')
            })
        }
      })
    })
    .catch(err => {
      const message = err || 'Failed to create backup'
      logger.serverLog(message, `${TAG}: exports.createChatBotBackup`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Failed to restore backup'
          logger.serverLog(message, `${TAG}: exports.restoreBackup`, req.body, {user: req.user}, 'error')
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
                      const message = err || 'Failed to restore backup'
                      logger.serverLog(message, `${TAG}: exports.restoreBackup`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, 'Failed to restore backup')
                    })
                })
                .catch(err => {
                  const message = err || 'Failed to restore backup'
                  logger.serverLog(message, `${TAG}: exports.restoreBackup`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, 'Failed to restore backup')
                })
            })
            .catch(err => {
              const message = err || 'Failed to restore backup'
              logger.serverLog(message, `${TAG}: exports.restoreBackup`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, 'Failed to restore backup')
            })
        }
      })
    })
    .catch(err => {
      const message = err || 'Failed to restore backup'
      logger.serverLog(message, `${TAG}: exports.restoreBackup`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to restore backup')
    })
}

exports.redirectToUrl = (req, res) => {
  if (!req.headers['user-agent'].startsWith('facebook')) {
    urlDataLayer.findOneURL(req.params.id)
      .then(URLObject => {
        if (URLObject) {
          msgBlockDataLayer.findOneMessageBlock({ uniqueId: URLObject.module.id })
            .then(msgBlockFound => {
              chatbotAutomation.updateBotLifeStatsForBlock(msgBlockFound, false)
              chatbotAutomation.updateBotPeriodicStatsForBlock(msgBlockFound.module.id, false)
              res.writeHead(301, { Location: URLObject.originalURL.startsWith('http') ? URLObject.originalURL : `https://${URLObject.originalURL}` })
              res.end()
            })
            .catch(err => {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.redirectToUrl`, {}, {user: req.user, params: req.params}, 'error')
                sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
              }
            })
        } else {
          sendErrorResponse(res, 500, '', 'No URL found with id ' + req.params.id)
        }
      })
      .catch(err => {
        if (err) {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.redirectToUrl`, {}, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
        }
      })
  }
}

exports.exportData = (req, res) => {
  analyticsDataLayer.findForBotSubscribersAnalyticsForSQL({ companyId: req.user.companyId })
    .then(results => {
      var subscriberIds = results.map(value => value.subscriberId)
      var unique = subscriberIds.filter((v, i, a) => a.indexOf(v) === i)
      let subscribersData = []
      for (let i = 0; i < unique.length; i++) {
        let subscribers = results.filter(value => value.subscriberId === unique[i])
        let Path = JSON.parse(subscribers[subscribers.length - 1].blocksPath)
        let name = subscribers[subscribers.length - 1].subscriberName
        for (let j = 0; j < Path.length; j++) {
          let blockdata = {}
          blockdata.subscriberName = name
          let subPath = Path.slice(0, j + 1)
          for (let k = 0; k < subPath.length; k++) {
            blockdata[`step ${k + 1}`] = subPath[k].title
          }
          subscribersData.push(blockdata)
        }
        subscribersData.push('\n')
      }
      sendSuccessResponse(res, 200, subscribersData)
    }).catch(error => {
      const message = error || 'Failed to fetch the chatbot data.'
      logger.serverLog(message, `${TAG}: exports.exportData`, {}, {user: req.user, params: req.params}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to fetch the chatbot details.')
    })
}

exports.getCommerceChatbotTriggers = async (req, res) => {
  let chatbot = await datalayer.findOneChatBot({
    _id: req.params.chatbotId
  })
  const messageBlock = await msgBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  sendSuccessResponse(res, 200, messageBlock.triggers)
}

exports.updateCommerceChatbot = async (req, res) => {
  const updateResponse = await datalayer.genericUpdateChatBot({ _id: req.body.chatbotId }, req.body)
  sendSuccessResponse(res, 200, updateResponse, 'Commerce chatbot updated successfully')
  let updatedChatbot = await datalayer.findOneChatBot({
    _id: req.body.chatbotId
  })
  // if (req.body.botLinks && req.body.botLinks.faqs) {
  //   commerceLogicLayer.updateFaqsForStartingBlock(updatedChatbot)
  // }
  if (req.body.triggers) {
    msgBlockDataLayer.genericUpdateMessageBlock({ uniqueId: updatedChatbot.startingBlockId }, {
      triggers: req.body.triggers
    })
  }
  if (req.body.storeType) {
    let ecommerceProvider = null
    if (req.body.storeType === commerceConstants.shopify) {
      const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
      ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
    } else if (req.body.storeType === commerceConstants.bigcommerce) {
      const bigCommerceIntegration = await bigCommerceDataLayer.findOneBigCommerceIntegration({ companyId: req.user.companyId })
      ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
        shopToken: bigCommerceIntegration.shopToken,
        storeHash: bigCommerceIntegration.payload.context
      })
    } else if (req.body.storeType === commerceConstants.shops) {
      let facebookInfo = req.user.facebookInfo
      if (req.user.role !== 'buyer') {
        facebookInfo = req.user.buyerInfo.facebookInfo
      }
      ecommerceProvider = new EcommerceProvider(commerceConstants.shops, {
        shopUrl: facebookInfo.fbId,
        shopToken: facebookInfo.fbToken // shopifyIntegration.shopToken
      })
    }
    if (ecommerceProvider) {
      let storeName = ''
      if (req.body.storeType === commerceConstants.shops) {
        storeName = req.body.storeName
      } else {
        let storeInfo = await ecommerceProvider.fetchStoreInfo()
        storeName = storeInfo.name
      }
      commerceLogicLayer.updateStartingBlock(updatedChatbot, storeName)
    }
  }
}

exports.createCommerceChatbot = async (req, res) => {
  try {
    let ecommerceProvider = null
    if (req.body.storeType === commerceConstants.shopify) {
      const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
      ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
    } else if (req.body.storeType === commerceConstants.bigcommerce) {
      const bigCommerceIntegration = await bigCommerceDataLayer.findOneBigCommerceIntegration({ companyId: req.user.companyId })
      ecommerceProvider = new EcommerceProvider(commerceConstants.bigcommerce, {
        shopToken: bigCommerceIntegration.shopToken,
        storeHash: bigCommerceIntegration.payload.context
      })
    } else if (req.body.storeType === commerceConstants.shops) {
      let facebookInfo = req.user.facebookInfo
      if (req.user.role !== 'buyer') {
        facebookInfo = req.user.buyerInfo.facebookInfo
      }
      ecommerceProvider = new EcommerceProvider(commerceConstants.shops, {
        shopUrl: facebookInfo.fbId,
        shopToken: facebookInfo.fbToken // shopifyIntegration.shopToken
      })
    }
    if (ecommerceProvider) {
      let storeName = ''
      if (req.body.storeType === commerceConstants.shops) {
        storeName = req.body.storeName
      } else {
        let storeInfo = await ecommerceProvider.fetchStoreInfo()
        storeName = storeInfo.name
      }
      let chatbot = await datalayer.createForChatBot({
        pageId: req.body.pageId,
        companyId: req.user.companyId,
        userId: req.user._id,
        type: 'automated',
        vertical: 'commerce',
        botLinks: req.body.botLinks,
        storeType: req.body.storeType,
        businessId: req.body.businessId,
        catalogId: req.body.catalogId,
        catalog: req.body.catalog,
        storeName: req.body.storeName
      })
      let messageBlocks = commerceLogicLayer.getMessageBlocks(chatbot, storeName)
      await datalayer.genericUpdateChatBot({ companyId: req.user.companyId, pageId: req.body.pageId, type: 'automated' }, {
        startingBlockId: messageBlocks[0].uniqueId
      })
      chatbot.startingBlockId = messageBlocks[0].uniqueId
      sendSuccessResponse(res, 200, chatbot, 'Commerce chatbot created successfully')
    } else {
      sendErrorResponse(res, 500, 'No e-commerce provider is integrated', 'No e-commerce provider is integrated')
    }
  } catch (err) {
    const message = err || 'Failed to fetch the chatbot data.'
    logger.serverLog(message, `${TAG}: exports.createCommerceChatbot`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, err ? err.message : `Failed to create commerce chatbot`, `Failed to create commerce chatbot`)
  }
}
