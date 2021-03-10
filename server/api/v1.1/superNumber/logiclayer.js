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
      templateArguments = `${customerName},${shopName},${checkout.currency} ${checkout.totalPrice},${checkout.abandoned_checkout_url}, https://wa.me/${supportNumber}`
    } else {
      templateArguments = `${customerName},${checkout.currency} ${checkout.totalPrice},${shopName},${checkout.abandoned_checkout_url}, https://wa.me/${supportNumber}`
    }
  }
  return templateArguments
}
exports.summarisedAnalyticsQuery = (body, companyId, type, automated) => {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let groupQuery
  let matchQuery
  if (type === 'contacts') {
    matchQuery = {
      companyId: companyId,
      datetime: {$gte: startDate, $lt: endDate}
    }
    groupQuery = {
      _id: null,
      count: {$sum: 1}
    }
  } else {
    matchQuery = {
      companyId: companyId,
      datetime: {$gte: startDate, $lt: endDate},
      automatedMessage: automated
    }
    groupQuery = {
      _id: null,
      count: {$sum: '$messagesSent'}
    }
  }
  return {
    matchQuery, groupQuery
  }
}
