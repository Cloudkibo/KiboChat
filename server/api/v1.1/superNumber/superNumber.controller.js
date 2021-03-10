const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const { callApi } = require('../utility')
const shopifyDataLayer = require('./../shopify/shopify.datalayer')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logicLayer = require('./logiclayer')
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

exports.sendManualMessage = async (req, res) => {
  try {
    let query = {
      companyId: req.user.companyId,
      $or: [
        {number: req.body.number},
        {number: req.body.number.replace(/\D/g, '')}
      ]
    }
    let contact = await callApi(`whatsAppContacts/query`, 'post', query)
    if (contact.length > 0 && contact[0].marketing_optin) {
      contact = contact[0]
      const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
      if (shopifyIntegration) {
        const shopify = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        const storeInfo = await shopify.fetchStoreInfo()
        let message = logicLayer.prepareManualMessage(req.body.templateName, req.body.template, contact, storeInfo.name, req.body.supportNumber, req.body.order, req.body.checkout)
        whatsAppMapper(message.provider, ActionTypes.SEND_CHAT_MESSAGE, message)
        sendSuccessResponse(res, 200, 'Message sent successfully')
      } else {
        sendErrorResponse(res, 500, null, 'No Shopify Integration found')
      }
    } else {
      sendErrorResponse(res, 500, null, 'This customer has not opted-in.')
    }
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.sendManualMessage`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to send message')
  }
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
