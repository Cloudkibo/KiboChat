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
    }
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
exports.queryForMessages = function (body, companyId, format, type) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    companyId: companyId,
    datetime: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true },
    format: format
  }
  if (type) {
    match['payload.templateName'] = type === 'template' ? {$exists: true} : {$exists: false}
  }
  let group = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1},
    uniqueValues: {$addToSet: '$contactId'}
  }
  return {
    purpose: 'aggregate',
    match,
    group
  }
}
exports.queryForZoomMeetings = function (body, companyId) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    companyId: companyId,
    platform: 'whatsApp',
    datetime: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true }
  }
  let group = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}
  }
  return {
    purpose: 'aggregate',
    match,
    group
  }
}
exports.queryForActiveSubscribers = function (body, companyId) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    companyId: companyId,
    lastMessagedAt: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true }
  }
  let group = {
    _id: null,
    count: {$sum: 1}
  }
  return [
    {$match: match},
    {$group: group}
  ]
}
