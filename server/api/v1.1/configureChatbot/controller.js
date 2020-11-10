const logiclayer = require('./logiclayer')
const datalayer = require('./datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')

exports.create = function (req, res) {
  const payload = logiclayer.preparePayload(req.user, req.body)
  datalayer.createChatbotRecord(payload)
    .then(created => {
      return sendSuccessResponse(res, 201, created, 'Chatbot created successfully!')
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to create chatbot.')
    })
}

exports.index = function (req, res) {
  datalayer.fetchChatbotRecords({companyId: req.user.companyId, platform: req.user.platform})
    .then(records => {
      return sendSuccessResponse(res, 200, records)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch chatbots.')
    })
}

exports.details = function (req, res) {
  datalayer.fetchChatbotBlockRecords({chatbotId: req.params.id})
    .then(records => {
      return sendSuccessResponse(res, 200, records)
    })
    .catch(error => {
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
      return logger.serverLog(message, `${TAG}: exports._unsetChatbotContext`, {}, {}, 'error')
    })
}

exports.update = function (req, res) {
  const published = req.body.published
  if (published) {
    _unsetChatbotContext(req.user.companyId, req.user.platform)
    datalayer.fetchChatbotRecords({companyId: req.user.companyId, platform: req.user.platform, published})
      .then(records => {
        if (records.length > 0) {
          return sendErrorResponse(res, 500, null, `On ${req.user.platform} platform, a chabot is already published. You can not publish more than one chatbot.`)
        } else {
          datalayer.updateChatbotRecord({chatbotId: req.body.chatbotId}, {...req.body})
            .then(created => {
              return sendSuccessResponse(res, 200, created, 'Chatbot updated successfully!')
            })
            .catch(error => {
              return sendErrorResponse(res, 500, error, 'Failed to update chatbot.')
            })
        }
      })
      .catch(error => {
        return sendErrorResponse(res, 500, error, 'Failed to update chatbot.')
      })
  } else {
    datalayer.updateChatbotRecord({chatbotId: req.body.chatbotId}, {...req.body})
      .then(created => {
        return sendSuccessResponse(res, 200, created, 'Chatbot updated successfully!')
      })
      .catch(error => {
        return sendErrorResponse(res, 500, error, 'Failed to update chatbot.')
      })
  }
}

exports.handleBlock = function (req, res) {
  datalayer.fetchChatbotBlockRecords({uniqueId: req.body.uniqueId})
    .then(records => {
      const block = records[0]
      const payload = logiclayer.prepareBlockPayload(req.user, req.body)
      if (block) {
        datalayer.updateChatbotBlockRecord({uniqueId: req.body.uniqueId}, payload)
          .then(created => {
            return sendSuccessResponse(res, 200, created, 'Chatbot created successfully!')
          })
          .catch(error => {
            return sendErrorResponse(res, 500, error, 'Failed to create chatbot.')
          })
      } else {
        datalayer.createChatbotBlockRecord(payload)
          .then(created => {
            return sendSuccessResponse(res, 201, created, 'Chatbot block created successfully!')
          })
          .catch(error => {
            return sendErrorResponse(res, 500, error, 'Failed to create chatbot block')
          })
      }
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch chatbot records')
    })
}

exports.deleteBlock = function (req, res) {
  datalayer.deleteChatbotBlocks({uniqueId: req.body.ids})
    .then(deleted => {
      return sendSuccessResponse(res, 200, deleted, 'Chatbot deleted successfully!')
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to delete chatbot.')
    })
}
