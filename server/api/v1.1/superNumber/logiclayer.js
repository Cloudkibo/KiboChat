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
exports.detailedAnalyticsQuery = (body, companyId, automated, type) => {
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
  matchQuery = {
    companyId: companyId,
    datetime: {$gte: startDate, $lt: endDate},
    automatedMessage: automated,
    messageType: type
  }
  groupQuery = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: '$messagesSent'}
  }
  return {
    matchQuery, groupQuery
  }
}
exports.prepareDetailedAnalyticsData = (results) => {
  let graphDatas = {
    confirmation: {},
    shipment: {},
    abandoned: {},
    cod: {}
  }
  let confirmationCount = 0
  let shipmentCount = 0
  let abandonedCount = 0
  let codCount = 0
  let confirmation = results[0]
  let shipment = results[1]
  let abandoned = results[2]
  let cod = results[3]
  if (confirmation.length > 0) {
    graphDatas.confirmation = confirmation
    confirmationCount = confirmation.reduce(function (a, b) {
      return a + b['count']
    }, 0)
  }
  if (shipment.length > 0) {
    graphDatas.shipment = shipment
    shipmentCount = shipment.reduce(function (a, b) {
      return a + b['count']
    }, 0)
  }
  if (abandoned.length > 0) {
    graphDatas.abandoned = abandoned
    abandonedCount = abandoned.reduce(function (a, b) {
      return a + b['count']
    }, 0)
  }
  if (cod.length > 0) {
    graphDatas.cod = cod
    codCount = cod.reduce(function (a, b) {
      return a + b['count']
    }, 0)
  }
  return {
    confirmationCount: confirmationCount,
    shipmentCount: shipmentCount,
    abandonedCount: abandonedCount,
    codCount: codCount,
    graphDatas
  }
}
exports.getMessageLogsCriterias = function (body, companyId) {
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    companyId: companyId,
    automatedMessage: body.automatedMessage
  }
  if (body.messageType.$or) {
    findCriteria['$or'] = body.messageType.$or
  } else {
    findCriteria['messageType'] = body.messageType
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]

  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
exports.CODAnalyticsQuery = (body, companyId, messageType, status) => {
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
  matchQuery = {
    companyId: companyId,
    datetime: {$gte: startDate, $lt: endDate},
    automatedMessage: true,
    messageType: messageType
  }
  if (status) {
    matchQuery.status = status
  }
  groupQuery = {
    _id: null,
    currency: { $first: '$currency' },
    amount: { $sum: '$amount' },
    count: { $sum: 1 }
  }
  return {
    matchQuery, groupQuery
  }
}
exports.widgetAnalyticsQuery = (body, companyId, type) => {
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
  matchQuery = {
    companyId: companyId,
    datetime: {$gte: startDate, $lt: endDate},
    widgetType: body.widgetType
  }
  groupQuery = {
    count: {$sum: '$clickCounts'}
  }
  if (type === 'date') {
    groupQuery._id = {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}}
  } else {
    groupQuery._id = '$pageUrl'
  }
  return {
    matchQuery, groupQuery
  }
}
