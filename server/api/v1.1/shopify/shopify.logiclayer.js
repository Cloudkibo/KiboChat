const moment = require('moment')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const {whatsAppMapper} = require('../../../whatsAppMapper/whatsAppMapper')
const {ActionTypes} = require('../../../whatsAppMapper/constants')

exports.getOptInMessage = (shopName, contact) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: 'OPT_IN', language: 'english'})
  let preparedMessage = {
    type: 'superNumber',
    provider: superWhatsAppAccount.provider,
    payload: {
      componentType: 'text',
      templateArguments: shopName,
      templateName: templateMessage.name,
      templateCode: templateMessage.code
    },
    whatsApp: superWhatsAppAccount,
    recipientNumber: contact.number
  }
  return preparedMessage
}

exports.getOrderConfirmationMessage = (contact, superNumberPreferences, company, body, shopUrl, shopName) => {
  let preparedMessage = {}
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  if (superNumberPreferences && superNumberPreferences.cashOnDelivery && superNumberPreferences.cashOnDelivery.enabled && body.payment_gateway_names &&
    body.payment_gateway_names[0] && body.payment_gateway_names[0].includes('COD')) {
    let templateMessage = whatsAppMapper(
      superWhatsAppAccount.provider,
      ActionTypes.GET_COMMERCE_TEMPLATES,
      {type: 'COD_ORDER_CONFIRMATION', language: superNumberPreferences.cashOnDelivery.language})
    let replacedValues = prepareCODOrderConfirmationMessage(superNumberPreferences.cashOnDelivery.language, contact, body, superNumberPreferences.cashOnDelivery.supportNumber, shopName)
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
  } else if (superNumberPreferences && superNumberPreferences.orderCRM && superNumberPreferences.orderCRM.confirmationEnabled) {
    let templateMessage = whatsAppMapper(
      superWhatsAppAccount.provider,
      ActionTypes.GET_COMMERCE_TEMPLATES,
      {type: 'ORDER_CONFIRMATION', language: superNumberPreferences.orderCRM.language})
    let replacedValues = prepareOrderConfirmationMessage(templateMessage.text, contact.name, body, superNumberPreferences.orderCRM.supportNumber, shopName)
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
  } else if (company.whatsApp) {
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

function prepareCODOrderConfirmationMessage (language, contact, body, supportNumber, shopName) {
  let templateArguments = ''
  if (language === 'urdu') {
    templateArguments = `${contact.name},${shopName},${body.currency} ${body.total_line_items_price},https://kibochat.cloudkibo.com/cod/${contact._id}/${body.order_number},https://wa.me/${supportNumber}`
  } else {
    templateArguments = `${contact.name},${body.currency} ${body.total_line_items_price},${shopName},https://kibochat.cloudkibo.com/cod/${contact._id}/${body.order_number},https://wa.me/${supportNumber}`
  }
  return templateArguments
}

function prepareOrderConfirmationMessage (language, contactName, body, supportNumber, shopName) {
  let templateArguments = ''
  if (language === 'urdu') {
    templateArguments = `${contactName},${shopName},${body.name},${body.order_status_url},https://wa.me/${supportNumber}`
  } else {
    templateArguments = `${contactName},${body.currency} ${body.total_line_items_price},${shopName},${body.name},${body.order_status_url},https://wa.me/${supportNumber}`
  }
  return templateArguments
}
exports.getOrderShipmentMessage = (contact, superNumberPreferences, fulfillment, shopName) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: 'ORDER_SHIPMENT', language: superNumberPreferences.orderCRM.language})
  let replacedValues = prepareOrderShipmentMessage(superNumberPreferences.orderCRM.language, contact.name, fulfillment, superNumberPreferences.orderCRM.supportNumber, shopName)
  let payload = {
    componentType: 'text',
    templateArguments: replacedValues,
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
function prepareOrderShipmentMessage (language, contactName, fulfillment, supportNumber, shopName) {
  let templateArguments = `${contactName},${shopName},${fulfillment.tracking_number},${fulfillment.tracking_url},https://wa.me/${supportNumber}`
  return templateArguments
}
