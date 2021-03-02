const moment = require('moment')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const {whatsAppMapper} = require('../../../whatsAppMapper/whatsAppMapper')
const {ActionTypes} = require('../../../whatsAppMapper/constants')

exports.getOrderConfirmationMessage = (contact, shopifyIntegration, company, body, shopUrl, shopName) => {
  let preparedMessage = {}
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  if (shopifyIntegration.COD && shopifyIntegration.COD.enabled && body.payment_gateway_names &&
    body.payment_gateway_names[0] && body.payment_gateway_names[0].includes('COD')) {
    let templateMessage = whatsAppMapper(
      superWhatsAppAccount.provider,
      ActionTypes.GET_COMMERCE_TEMPLATES,
      {type: 'COD_ORDER_CONFIRMATION', language: shopifyIntegration.COD.language})
    let replacedValues = prepareCODOrderConfirmationMessage(templateMessage.text, contact.name, body, shopifyIntegration.orderConfirmation.supportNumber, shopName)
    preparedMessage = {
      type: 'superNumber',
      provider: superWhatsAppAccount.provider,
      payload: {
        text: replacedValues.text,
        componentType: 'text',
        templateArguments: replacedValues.templateArguments,
        templateName: templateMessage.name,
        templateCode: templateMessage.code
      },
      whatsApp: superWhatsAppAccount,
      recipientNumber: contact.number
    }
  } else if (shopifyIntegration.orderConfirmation && shopifyIntegration.orderConfirmation.enabled) {
    let templateMessage = whatsAppMapper(
      superWhatsAppAccount.provider,
      ActionTypes.GET_COMMERCE_TEMPLATES,
      {type: 'ORDER_CONFIRMATION', language: shopifyIntegration.orderConfirmation.language})
    let replacedValues = prepareOrderConfirmationMessage(templateMessage.text, contact.name, body, shopifyIntegration.orderConfirmation.supportNumber, shopName)
    preparedMessage = {
      type: 'superNumber',
      provider: superWhatsAppAccount.provider,
      payload: {
        text: replacedValues.text,
        componentType: 'text',
        templateArguments: replacedValues.templateArguments,
        templateName: templateMessage.name,
        templateCode: templateMessage.code
      },
      whatsApp: superWhatsAppAccount,
      recipientNumber: contact.number
    }
  } else {
    if (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15) {
      const messageBlock = {
        module: {
          id: company.whatsApp.activeWhatsappBot,
          type: 'whatsapp_commerce_chatbot'
        },
        title: 'Order Confirmation Notification',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Hi ${contact.name},\n\nThank you for placing an order at ${shopUrl}.\n\n This is your order number: ${body.name.slice(1)}`,
            componentType: 'text'
          }
        ],
        userId: company.ownerId,
        companyId: company._id
      }
      if (body.order_status_url) {
        messageBlock.payload[0].text += `\n\n **H** Home`
      }
      preparedMessage = {
        credentials: {
          accessToken: company.whatsApp.accessToken,
          accountSID: company.whatsApp.accountSID,
          businessNumber: company.whatsApp.businessNumber
        },
        payload: messageBlock,
        type: 'chatbot'
      }
    }
  }
  return preparedMessage
}

function prepareCODOrderConfirmationMessage (text, contactName, body, supportNumber, shopName) {
  let templateArguments = `${contactName},${body.currency} ${body.total_line_items_price},${shopName},${body.name}, ,${supportNumber}`
  text = text.replace(/{{customer_name}}/g, contactName)
  text = text.replace(/{{order_value}}/g, body.currency + ' ' + body.total_line_items_price)
  text = text.replace(/{{shop_name}}/g, shopName)
  text = text.replace(/{{cod_confirmation_page_url}}/g, '')
  text = text.replace(/{{support_number}}/g, supportNumber)
  return {
    text: text,
    templateArguments: templateArguments
  }
}

function prepareOrderConfirmationMessage (text, contactName, body, supportNumber, shopName) {
  let templateArguments = `${contactName},${body.currency} ${body.total_line_items_price},${shopName},${body.name},${body.order_status_url},${supportNumber}`
  text = text.replace(/{{customer_name}}/g, contactName)
  text = text.replace(/{{order_value}}/g, body.currency + ' ' + body.total_line_items_price)
  text = text.replace(/{{shop_name}}/g, shopName)
  text = text.replace(/{{order_ID}}/g, body.name)
  text = text.replace(/{{order_status_url}}/g, body.order_status_url)
  text = text.replace(/{{support_number}}/g, supportNumber)
  return {
    text: text,
    templateArguments: templateArguments
  }
}
exports.getOrderShipmentMessage = (contact, shopifyIntegration, fulfillment, shopName) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: 'ORDER_SHIPMENT', language: shopifyIntegration.orderShipment.language})
  let replacedValues = prepareOrderShipmentMessage(templateMessage.text, contact.name, fulfillment, shopifyIntegration.orderShipment.supportNumber, shopName)
  let payload = {
    text: replacedValues.text,
    componentType: 'text',
    templateArguments: replacedValues.templateArguments,
    templateName: templateMessage.name,
    templateCode: templateMessage.code
  }
  let preparedMessage = {
    provider: superWhatsAppAccount.provider,
    payload: payload,
    whatsApp: superWhatsAppAccount,
    recipientNumber: contact.number
  }
  return preparedMessage
}
function prepareOrderShipmentMessage (text, contactName, fulfillment, supportNumber, shopName) {
  let templateArguments = `${contactName},${shopName},${fulfillment.tracking_number},${fulfillment.tracking_url},${supportNumber}`
  text = text.replace(/{{customer_name}}/g, contactName)
  text = text.replace(/{{shop_name}}/g, shopName)
  text = text.replace(/{{tracking_ID}}/g, fulfillment.tracking_number)
  text = text.replace(/{{tracking_url}}/g, fulfillment.tracking_url)
  text = text.replace(/{{support_number}}/g, supportNumber)
  return {
    text: text,
    templateArguments: templateArguments
  }
}
