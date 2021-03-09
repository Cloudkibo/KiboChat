const { getSuperWhatsAppAccount } = require('../../global/utility')

exports.prepareManualMessage = (templateName, template, contact, storeName, supportNumber, order, checkout) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateArguments = getTemplateArguments(templateName, template.code, contact.name, storeName, supportNumber, order, checkout)
  return {
    provider: superWhatsAppAccount.provider,
    payload: {
      componentType: 'text',
      templateArguments: templateArguments,
      templateName: template.name,
      templateCode: template.code,
      templateId: template.id
    },
    whatsApp: superWhatsAppAccount,
    recipientNumber: contact.number
  }
}

function getTemplateArguments (templateName, templateCode, customerName, shopName, supportNumber, order, checkout) {
  let templateArguments = ''
  if (templateName === 'ORDER_CONFIRMATION') {
    if (templateCode === 'ur') {
      templateArguments = `${customerName},${shopName},${order.currency} ${order.totalPrice},#${order.orderNumber},${order.orderStatusUrl},https://wa.me/${supportNumber}`
    } else {
      templateArguments = `${customerName},${order.currency} ${order.totalPrice},${shopName},#${order.orderNumber},${order.orderStatusUrl},https://wa.me/${supportNumber}`
    }
  } else if (templateName === 'ORDER_SHIPMENT') {
    templateArguments = `${customerName},${shopName},${order.trackingId},${order.trackingUrl},https://wa.me/${supportNumber}`
  } else if (templateName === 'ABANDONED_CART_RECOVERY' && checkout) {
    if (templateCode === 'ur') {
      templateArguments = `${customerName},${shopName},${order.currency} ${order.totalPrice},${checkout.abandoned_checkout_url}, https://wa.me/${supportNumber}`
    } else {
      templateArguments = `${customerName},${order.currency} ${order.totalPrice},${shopName},${checkout.abandoned_checkout_url}, https://wa.me/${supportNumber}`
    }
  }
  return templateArguments
}
