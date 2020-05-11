const logiclayer = require('./chatbots.logiclayer')
const datalayer = require('./chatbots.datalayer')
const msgBlockDataLayer = require('./../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { kibochat, kiboengage } = require('../../global/constants').serverConstants
const async = require('async')

exports.index = function (req, res) {
  callApi(`pages/query`, 'post', {companyId: req.user.companyId, connected: true})
    .then(pages => {
      let pageIds = logiclayer.prepareIdsArray(pages)
      datalayer.findAllChatBots({pageId: { $in: pageIds }})
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
  let dataToUpdate = { published: req.body.published }
  datalayer.genericUpdateChatBot({_id: req.body.chatbotId}, dataToUpdate)
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

exports.createBackup = function (req, res) {
  const { chatbotId } = req.body
  const fetchChatbot = callApi(
    `chatbots/query`,
    'post',
    {purpose: 'findOne', match: {_id: chatbotId}},
    kibochat
  )
  const fetchBlocks = callApi(
    `messageBlocks/query`,
    'post',
    {purpose: 'findAll', match: {'module.id': chatbotId, 'module.type': 'chatbot'}},
    kiboengage
  )
  Promise.all([fetchChatbot, fetchBlocks])
    .then(results => {
      const chatbot = results[0]
      const blocks = results[1]
      const chatbotPayload = logiclayer.chatbotBackupPayload(chatbot)
      const createChatbotBackup = callApi(
        `chatbots_backup`,
        'put',
        {purpose: 'updateOne', match: {chatbotId}, updated: chatbotPayload, upsert: true},
        kibochat
      )
      const backupCalls = [createChatbotBackup]
      async.each(blocks, function (block, cb) {
        let blockPayload = logiclayer.blockBackupPayload(block)
        backupCalls.push(
          callApi(
            `messageBlocks_backup`,
            'put',
            {purpose: 'updateOne', match: {'module.id': chatbotId, 'module.type': 'chatbot'}, updated: blockPayload, upsert: true},
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
    {purpose: 'deleteAll', match: {'module.id': chatbotId, 'module.type': 'chatbot'}},
    kiboengage
  )
  const fetchChatbotBackup = callApi(
    `chatbots_backup/query`,
    'post',
    {purpose: 'findOne', match: {chatbotId}},
    kibochat
  )
  const fetchBlocksBackup = callApi(
    `messageBlocks_backup/query`,
    'post',
    {purpose: 'findAll', match: {'module.id': chatbotId, 'module.type': 'chatbot'}},
    kiboengage
  )
  Promise.all([deleteBlocks, fetchChatbotBackup, fetchBlocksBackup])
    .then(results => {
      const chatbotBackup = results[1]
      const blocksBackup = results[2]
      const chatbotPayload = logiclayer.chatbotPayload(chatbotBackup)
      const createChatbot = callApi(
        `chatbots`,
        'put',
        {purpose: 'updateOne', match: {_id: chatbotId}, updated: chatbotPayload, upsert: true},
        kibochat
      )
      const backupCalls = [createChatbot]
      async.each(blocksBackup, function (block, cb) {
        let blockPayload = logiclayer.blockPayload(block)
        backupCalls.push(
          callApi(
            `messageBlocks`,
            'post',
            blockPayload,
            kibochat
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
              sendSuccessResponse(res, 200, 'Backup restored successfully')
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
