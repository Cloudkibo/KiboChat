const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const logger = require('../../../components/logger')
const TAG = 'api/superNumberPreferences/superNumberPreferences.controller.js'
const dataLayer = require('../superNumber/datalayer')

exports.fetchTemplates = async (req, res) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: req.body.type, language: req.body.language})
  sendSuccessResponse(res, 200, templateMessage)
}

exports.index = function (req, res) {
  dataLayer.findOne({ companyId: req.user.companyId })
    .then(responses => {
      sendSuccessResponse(res, 200, responses)
    })
    .catch(err => {
      const message = err || 'Error occured while fetching responses'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching responses')
    })
}

exports.create = function (req, res) {
  var payload = {
    companyId: req.user.companyId,
    abandonedCart: req.body.abandonedCart,
    orderConfirmation: req.body.orderConfirmation,
    orderShipment: req.body.orderShipment,
    cashOnDelivery: req.body.cashOnDelivery
  }
  dataLayer.create(payload)
    .then(createdObj => {
      sendSuccessResponse(res, 200, createdObj)
    })
    .catch(err => {
      const message = err || 'Error occured while creating SuperNumberPreferences object'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {payload, user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating SuperNumberPreferences object')
    })
}

exports.update = function (req, res) {
  let updatedObject = req.body
  dataLayer.update('updateOne', {companyId: req.user.companyId}, updatedObject)
    .then(updated => {
      sendSuccessResponse(res, 200, 'SuperNumberPreferences updated succssfully')
    })
    .catch(err => {
      const message = err || 'Error occured while updating SuperNumberPreferences'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while SuperNumberPreferences')
    })
}

exports.delete = function (req, res) {
  dataLayer.deleteOne({ companyId: req.user.companyId })
    .then(deletedObj => {
      sendSuccessResponse(res, 200, 'SuperNumberPreferences deleted successfully!')
    })
    .catch(err => {
      const message = err || 'Error occured while deleting SuperNumberPreferences'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to delete SuperNumberPreferences.')
    })
}
