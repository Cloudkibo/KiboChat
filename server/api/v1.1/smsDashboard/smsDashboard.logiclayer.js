exports.queryForSubscribers = function (body, companyUser, isSubscribed) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed }
    },
    {$group: {
      _id: null,
      count: {$sum: 1}}
    }
  ]
  return query
}

exports.queryForSubscribersGraph = function (body, companyUser) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: true }
    },
    {$group: {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    },
    {$sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }}
  ]
  return query
}
exports.queryForSessions = function (body, companyUser) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: true,
      hasChat: true }
    },
    {$group: {
      _id: null,
      count: {$sum: 1}}
    }
  ]
  return query
}
exports.queryForSessionsGraph = function (body, companyUser) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: true,
      hasChat: true }
    },
    {$group: {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    }
  ]
  return query
}

exports.getDashboardDataCriteria = function (key, startDate, endDate, companyId) {
  const groupQuery = {
    _id: {
      'year': {$year: '$datetime'},
      'month': {$month: '$datetime'},
      'day': {$dayOfMonth: '$datetime'}
    },
    count: {$sum: 1}
  }
  const datetimeCriteria = { $gte: startDate, $lt: endDate }
  switch (key) {
    case 'contacts':
      return [
        {$match: {companyId, isSubscribed: true, datetime: datetimeCriteria}},
        {$group: groupQuery}
      ]
    case 'messagesSent':
      return {
        purpose: 'aggregate',
        match: {companyId, format: {$in: ['kibopush', 'convos']}, datetime: datetimeCriteria},
        group: groupQuery
      }
    case 'messagesReceived':
      return {
        purpose: 'aggregate',
        match: {companyId, format: 'twilio', datetime: datetimeCriteria},
        group: groupQuery
      }
    default:
      return [
        {$match: {companyId, isSubscribed: true, datetime: datetimeCriteria}},
        {$group: groupQuery}
      ]
  }
}

exports.transformData = function (contacts, messagesSent, messagesReceived) {
  let data = [...new Set([...contacts, ...messagesSent, ...messagesReceived].map((item) => item.date))]
  let result = []
  for (let i = 0; i < data.length; i++) {
    let contact = contacts.find((item) => item.date === data[i])
    let sent = messagesSent.find((item) => item.date === data[i])
    let received = messagesReceived.find((item) => item.date === data[i])
    result.push({
      date: data[i],
      contacts: contact ? contact.contacts : 0,
      messagesSent: sent ? sent.messagesSent : 0,
      messagesReceived: received ? received.messagesReceived : 0
    })
  }
  return result
}
