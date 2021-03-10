const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const shopifyDataLayer = require('./../shopify/shopify.datalayer')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logger = require('../../../components/logger')
const TAG = 'api/superNumber/codpages.controller.js'
const dataLayer = require('../superNumber/datalayer')

exports.addConfirmTag = async (req, res) => {
  try {
    if (req.body.storeType === 'shopify') {
      const shopifyIntegrations = await shopifyDataLayer.findShopifyIntegrations({
        companyId: req.body.companyId
      })
      const superNumberPreferences = await dataLayer.findOne({companyId: req.body.companyId})
      for (const shopifyIntegration of shopifyIntegrations) {
        const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        ecommerceProvider.updateOrderTag(req.body.order, superNumberPreferences.cashOnDelivery.cod_tags.confirmed_tag)
      }
      await dataLayer.deleteOne({ order: req.body.order, companyId: req.body.companyId })
      sendSuccessResponse(res, 200, { done: true }, 'updated the order')
    } else {
      sendErrorResponse(res, 404, { done: false }, 'Store not found')
    }
  } catch (err) {
    const message = err || 'Error processing for adding confirm tag to order'
    logger.serverLog(message, `${TAG}: exports.addConfirmTag`, req.body, {header: req.header}, 'error')
    sendErrorResponse(res, 501, { done: false }, 'Internal Server Error')
  }
}

exports.addCancelledTag = async (req, res) => {
  try {
    if (req.body.storeType === 'shopify') {
      const shopifyIntegrations = await shopifyDataLayer.findShopifyIntegrations({
        companyId: req.body.companyId
      })
      const superNumberPreferences = await dataLayer.findOne({companyId: req.body.companyId})
      for (const shopifyIntegration of shopifyIntegrations) {
        const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        ecommerceProvider.updateOrderTag(req.body.order, superNumberPreferences.cashOnDelivery.cod_tags.cancelled_tag)
      }
      await dataLayer.deleteOne({ order: req.body.order, companyId: req.body.companyId })
      sendSuccessResponse(res, 200, { done: true }, 'updated the order')
    } else {
      sendErrorResponse(res, 404, { done: false }, 'Store not found')
    }
  } catch (err) {
    const message = err || 'Error processing for adding confirm tag to order'
    logger.serverLog(message, `${TAG}: exports.addConfirmTag`, req.body, {header: req.header}, 'error')
    sendErrorResponse(res, 501, { done: false }, 'Internal Server Error')
  }
}
