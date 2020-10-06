const logiclayer = require('./logiclayer')
const datalayer = require('./datalayer')
// const logger = require('../../../components/logger')
// const TAG = 'api/v1.1/chatbots/chatbots.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

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
  datalayer.fetchChatbotRecords({companyId: req.user.companyId})
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
      // const blocks = records.map((item) => {
      //   item.payload = JSON.parse(item.payload)
      //   item.options = JSON.parse(item.options)
      //   item.triggers = JSON.parse(item.triggers)
      //   return item
      // })
      return sendSuccessResponse(res, 200, records)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to fetch chatbot blocks')
    })
}

exports.update = function (req, res) {
  datalayer.updateChatbotRecord({chatbotId: req.body.chatbotId}, {...req.body})
    .then(created => {
      return sendSuccessResponse(res, 200, created, 'Chatbot updated successfully!')
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to update chatbot.')
    })
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
