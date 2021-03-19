const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const shopifyDataLayer = require('./../shopify/shopify.datalayer')
const shopifyLogicLayer = require('./../shopify/shopify.logiclayer')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logger = require('../../../components/logger')
const TAG = 'api/superNumber/codpages.controller.js'
const dataLayer = require('../superNumber/codpages.datalayer')
const { ActionTypes } = require('../../../whatsAppMapper/constants')
const superNumberDataLayer = require('../superNumber/datalayer')
const { saveAnalytics, saveMessageLogs } = require('../superNumber/utility')
const { getContactById } = require('./../utility/miscApiCalls.controller')

exports.addConfirmTag = async (req, res) => {
  try {
    if (req.body.storeType === 'shopify') {
      const shopifyIntegrations = await shopifyDataLayer.findShopifyIntegrations({
        companyId: req.body.companyId
      })

      const superNumberPreferences = await superNumberDataLayer.findOne({companyId: req.body.companyId})

      for (const shopifyIntegration of shopifyIntegrations) {
        const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })

        const order = await ecommerceProvider.checkOrderStatus(req.body.order)
        const contact = await getContactById(req.body.companyId, req.body.contactId)
        const restOrderPayload = await ecommerceProvider.checkOrderStatusByRest(order.id.split('/')[4])
        sendConfirmationMessage(superNumberPreferences, req.body.storeName, contact, restOrderPayload, shopifyIntegration)
        await ecommerceProvider.updateOrderTag(order.id.split('/')[4], superNumberPreferences.cashOnDelivery.cod_tags.confirmed_tag)
        let url = restOrderPayload.order_status_url.split('.com')[0]
        saveMessageLogs(contact, {
          id: restOrderPayload.order_number.toString(),
          url: `${url}.com/admin/orders/${restOrderPayload.id}`,
          amount: restOrderPayload.total_price,
          currency: restOrderPayload.currency,
          status: 'confirmed'
        },
        true,
        'COD_ORDER_CONFIRMATION')
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
      const superNumberPreferences = await superNumberDataLayer.findOne({companyId: req.body.companyId})
      for (const shopifyIntegration of shopifyIntegrations) {
        const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        const order = await ecommerceProvider.checkOrderStatus(req.body.order)
        await ecommerceProvider.updateOrderTag(order.id.split('/')[4], superNumberPreferences.cashOnDelivery.cod_tags.cancelled_tag)
        const contact = await getContactById(req.body.companyId, req.body.contactId)
        const restOrderPayload = await ecommerceProvider.checkOrderStatusByRest(order.id.split('/')[4])
        let url = restOrderPayload.order_status_url.split('.com')[0]
        saveMessageLogs(contact, {
          id: restOrderPayload.order_number,
          url: `${url}.com/admin/orders/${restOrderPayload.id}`,
          amount: restOrderPayload.total_price,
          currency: restOrderPayload.currency,
          status: 'cancelled'
        },
        true,
        'COD_ORDER_CONFIRMATION')
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

async function sendConfirmationMessage (superNumberPreferences, shopName, contact, order, shopifyIntegration) {
  let preparedMessage = {}
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: 'ORDER_CONFIRMATION', language: superNumberPreferences.orderCRM.language})
  let replacedValues = shopifyLogicLayer.prepareOrderConfirmationMessage(templateMessage.text, contact.name, order, superNumberPreferences.orderCRM.supportNumber, shopName)
  preparedMessage = {
    type: 'superNumber',
    provider: superWhatsAppAccount.provider,
    payload: {
      componentType: 'text',
      templateArguments: replacedValues,
      templateName: templateMessage.name,
      templateCode: templateMessage.code
    },
    whatsApp: superWhatsAppAccount,
    recipientNumber: contact.number
  }
  let url = order.order_status_url.split('.com')[0]
  saveMessageLogs(contact, {
    id: order.order_number.toString(),
    url: `${url}.com/admin/orders/${order.id}`,
    amount: order.total_price,
    currency: order.currency,
    status: 'confirmed'
  },
  true,
  'ORDER_CONFIRMATION')
  await whatsAppMapper(preparedMessage.provider, ActionTypes.SEND_CHAT_MESSAGE, preparedMessage)
  saveAnalytics(shopifyIntegration.companyId, true, preparedMessage.payload.templateName.includes('cod') ? 'COD_ORDER_CONFIRMATION' : 'ORDER_CONFIRMATION')
}
