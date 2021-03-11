const analyticsDataLayer = require('./superNumberAnalytics.datalayer')

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
