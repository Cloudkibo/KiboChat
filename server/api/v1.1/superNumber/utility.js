const analyticsDataLayer = require('./superNumberAnalytics.datalayer')
const messageLogsDataLayer = require('./superNumberMessageLogs.datalayer')

exports.saveAnalytics = async function (companyId, automatedMessage, messageType) {
  let matchQuery = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    companyId,
    automatedMessage,
    messageType
  }
  let project = {
    'year': {'$year': '$datetime'},
    'month': {'$month': '$datetime'},
    'day': {'$dayOfMonth': '$datetime'},
    companyId: 1,
    automatedMessage: 1,
    messageType: 1,
    _id: 1
  }
  const analytics = await analyticsDataLayer.aggregate(matchQuery, null, project)
  if (analytics.length > 0) {
    analyticsDataLayer.update('updateOne', {_id: analytics[0]._id}, { $inc: { 'messagesSent': 1 } })
  } else {
    analyticsDataLayer.create({
      automatedMessage,
      companyId,
      messageType,
      messagesSent: 1
    })
  }
}
exports.saveMessageLogs = async function (contact, payload, automatedMessage, messageType) {
  let matchQuery = {
    companyId: contact.companyId,
    customerNumber: contact.number,
    messageType,
    automatedMessage,
    id: payload.id
  }
  let data = {
    automatedMessage,
    messageType,
    companyId: contact.companyId,
    customerName: contact.name,
    customerNumber: contact.number,
    id: payload.id,
    url: payload.url,
    amount: payload.amount,
    currency: payload.currency,
    status: payload.status
  }
  const messageLog = await messageLogsDataLayer.findOne(matchQuery)
  if (messageLog) {
    messageLogsDataLayer.update('updateOne', {_id: messageLog._id}, data)
  } else {
    messageLogsDataLayer.create(data)
  }
}
