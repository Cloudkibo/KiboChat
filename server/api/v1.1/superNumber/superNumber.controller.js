const logger = require('../../../components/logger')
const TAG = 'api/superNumber/superNumber.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const { callApi } = require('../utility')
const dataLayer = require('./../shopify/shopify.datalayer')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logicLayer = require('./logiclayer')

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
    console.log('query', query)
    let contact = await callApi(`whatsAppContacts/query`, 'post', query)
    console.log('contact', contact)
    if (contact.length > 0 && contact[0].marketing_optin) {
      contact = contact[0]
      const shopifyIntegration = await dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
      if (shopifyIntegration) {
        const shopify = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        const storeInfo = await shopify.fetchStoreInfo()
        let message = logicLayer.prepareManualMessage(req.body.templateName, req.body.template, contact, storeInfo.name, req.body.supportNumber, req.body.order)
        console.log('message', message)
        whatsAppMapper(message.provider, ActionTypes.SEND_CHAT_MESSAGE, message)
        sendSuccessResponse(res, 200, 'Message sent successfully')
      } else {
        sendErrorResponse(res, 500, null, 'No Shopify Integration found')
      }
    } else {
      console.log('in else')
      sendErrorResponse(res, 500, null, 'This customer has not opted-in.')
    }
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.sendManualMessage`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to send message')
  }
}
