const logiclayer = require('./logiclayer')
const datalayer = require('./datalayer')
const smsChatbotdataLayer = require('./smsChatbot.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')
const { getDialogFlowClient } = require('../../global/dialogflow')
const { prepareIntentPayload } = require('../messageBlock/messageBlock.logiclayer')
const async = require('async')

exports.create = async function (req, res) {
  try {
    const payload = logiclayer.preparePayload(req.user, req.body)
    let created
    if (req.user.platform === 'sms' && req.body.vertical && req.body.vertical === 'ecommerce') {
      created = await smsChatbotdataLayer.create(payload)
    } else {
      created = await datalayer.createChatbotRecord(payload)
    }
    return sendSuccessResponse(res, 201, created, 'Chatbot created successfully!')
  } catch (error) {
    const message = error || 'Failed to create chatbot.'
    logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
    return sendErrorResponse(res, 500, error, 'Failed to create chatbot.')
  }
}

exports.index = function (req, res) {
  async.parallelLimit([
    function (callback) {
      datalayer.fetchChatbotRecords({companyId: req.user.companyId, platform: req.user.platform})
        .then(records => {
          callback(null, records)
        })
        .catch(error => {
          callback(error)
        })
    },
    function (callback) {
      smsChatbotdataLayer.findAll({companyId: req.user.companyId})
        .then(records => {
          callback(null, records)
        })
        .catch(error => {
          callback(error)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching chatbots'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      return sendSuccessResponse(res, 200, results[0].concat(results[1]))
    }
  })
}

exports.details = function (req, res) {
  datalayer.fetchChatbotBlockRecords({chatbotId: req.params.id})
    .then(records => {
      return sendSuccessResponse(res, 200, records)
    })
    .catch(error => {
      const message = error || 'Failed to fetch chatbot blocks'
      logger.serverLog(message, `${TAG}: exports.details`, {}, {params: req.params}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to fetch chatbot blocks')
    })
}

const _unsetChatbotContext = (companyId, platform) => {
  let module = ''
  if (platform === 'sms') {
    module = 'contacts'
  } else if (platform === 'whatsApp') {
    module = 'whatsAppContacts'
  }
  callApi(
    `${module}/update`,
    'put',
    {
      query: {companyId, chatbotContext: {$exists: true}},
      newPayload: {$unset: {chatbotContext: 1}},
      options: {multi: true}
    }
  )
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'error in message statistics'
      return logger.serverLog(message, `${TAG}: exports._unsetChatbotContext`, {}, {companyId, platform}, 'error')
    })
}

exports.update = async function (req, res) {
  try {
    const published = req.body.published
    if (req.body.vertical && req.body.vertical === 'ecommerce') {
      if (published) {
        const chatbot = await smsChatbotdataLayer.findOne(
          {companyId: req.user.companyId, vertical: req.body.vertical, published, _id: {$ne: req.body.chatbotId}})
        if (chatbot) {
          return sendErrorResponse(res, 500, null, `A chatbot is already published. You can not publish more than one chatbot.`)
        } else {
          let newPayload = req.body
          delete newPayload.chatbotId
          const updated = await smsChatbotdataLayer.update('updateOne', {_id: req.body.chatbotId}, newPayload)
          return sendSuccessResponse(res, 200, updated, 'Chatbot updated successfully!')
        }
      } else {
        let newPayload = req.body
        delete newPayload.chatbotId
        const updated = await smsChatbotdataLayer.update('updateOne', {_id: req.body.chatbotId}, newPayload)
        return sendSuccessResponse(res, 200, updated, 'Chatbot updated successfully!')
      }
    } else {
      if (published) {
        _unsetChatbotContext(req.user.companyId, req.user.platform)
        const chatbots = await datalayer.fetchChatbotRecords({companyId: req.user.companyId, platform: req.user.platform, published})
        if (chatbots.length > 0) {
          return sendErrorResponse(res, 500, null, `On ${req.user.platform} platform, a chatbot is already published. You can not publish more than one chatbot.`)
        } else {
          const updated = await datalayer.updateChatbotRecord({chatbotId: req.body.chatbotId}, {...req.body})
          return sendSuccessResponse(res, 200, updated, 'Chatbot updated successfully!')
        }
      } else {
        const updated = await datalayer.updateChatbotRecord({chatbotId: req.body.chatbotId}, {...req.body})
        return sendSuccessResponse(res, 200, updated, 'Chatbot updated successfully!')
      }
    }
  } catch (error) {
    const message = error || 'Failed to update chatbot.'
    logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
    return sendErrorResponse(res, 500, error, 'Failed to update chatbot.')
  }
}

exports.handleBlock = function (req, res) {
  datalayer.fetchChatbotBlockRecords({uniqueId: req.body.uniqueId})
    .then(async records => {
      try {
        const block = records[0]
        const payload = logiclayer.prepareBlockPayload(req.user, req.body)
        const chatbots = await datalayer.fetchChatbotRecords({chatbotId: req.body.chatbotId})
        if (chatbots.length > 0 && chatbots[0].dialogFlowAgentId) {
          const dialogflow = await getDialogFlowClient(req.user.companyId)
          const intentBody = prepareIntentPayload(req.body)
          if (!block || !block.dialogFlowIntentId) {
            const result = await dialogflow.projects.agent.intents.create({ parent: `${chatbots[0].dialogFlowAgentId}/agent`, requestBody: intentBody })
            payload.dialogFlowIntentId = result.data.name
          } else if (block.dialogFlowIntentId) {
            await dialogflow.projects.agent.intents.patch({
              name: block.dialogFlowIntentId,
              requestBody: intentBody
            })
          }
        }
        if (block) {
          datalayer.updateChatbotBlockRecord({uniqueId: req.body.uniqueId}, payload)
            .then(created => {
              return sendSuccessResponse(res, 200, created, 'Chatbot created successfully!')
            })
            .catch(error => {
              const message = error || 'Failed to create chatbot.'
              logger.serverLog(message, `${TAG}: exports.handleBlock`, req.body, {user: req.user, block}, 'error')
              return sendErrorResponse(res, 500, error, 'Failed to create chatbot.')
            })
        } else {
          datalayer.createChatbotBlockRecord(payload)
            .then(created => {
              return sendSuccessResponse(res, 201, created, 'Chatbot block created successfully!')
            })
            .catch(error => {
              const message = error || 'Failed to create chatbot.'
              logger.serverLog(message, `${TAG}: exports.handleBlock`, req.body, {user: req.user}, 'error')
              return sendErrorResponse(res, 500, error, 'Failed to create chatbot block')
            })
        }
      } catch (err) {
        let errorMessage = 'Failed to save changes.'
        if (err && err.errors && err.errors[0]) {
          errorMessage = err.errors[0].message
        }
        const message = err || 'Failed to save changes.'
        logger.serverLog(message, `${TAG}: exports.handleBlock`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, err, errorMessage)
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch chatbot records.'
      logger.serverLog(message, `${TAG}: exports.handleBlock`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to fetch chatbot records')
    })
}

exports.deleteBlock = async function (req, res) {
  try {
    const blocks = await datalayer.fetchChatbotRecords({uniqueId: req.body.ids})
    if (blocks && blocks.length > 0) {
      dataldayer.deleteChatbotBlocks({uniqueId: req.body.ids})
        .then(deleted => {
          async.each(blocks, async function (block, cb) {
            if (block.dialogFlowIntentId) {
              const dialogflow = await getDialogFlowClient(req.user.companyId)
              const result = await dialogflow.projects.agent.intents.delete({ name: block.dialogFlowIntentId })
              if (result) {
                cb()
              } else {
                cb(new Error('Failed to delete message block'))
              }
            } else {
              cb()
            }
          }, function (err) {
            if (err) {
              let errorMessage = 'Failed to delete message block'
              if (err && err.errors && err.errors[0]) {
                errorMessage = err.errors[0].message
              }
              const message = error || 'Failed to delete messageBlock'
              logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
              return res.status(500).json({ status: 'failed', description: errorMessage })
            } else {
              return sendSuccessResponse(res, 200, deleted, 'Chatbot block deleted successfully!')
            }
          })
        })
        .catch(error => {
          const message = error || 'Failed to delete chatbot.'
          logger.serverLog(message, `${TAG}: exports.deleteBlock`, req.body, {user: req.user}, 'error')
          return sendErrorResponse(res, 500, error, 'Failed to delete chatbot.')
        })
    } else {
      return res.status(403).json({status: 'failed', description: 'Block(s) do not exist'})
    }
  } catch (err) {
    let errorMessage = 'Failed to delete message block'
    if (err && err.errors && err.errors[0]) {
      errorMessage = err.errors[0].message
    }
    const message = error || 'Failed to delete message block.'
    logger.serverLog(message, `${TAG}: exports.deleteBlock`, req.body, {user: req.user}, 'error')
    return sendErrorResponse(res, 500, error, errorMessage)
  }
}
