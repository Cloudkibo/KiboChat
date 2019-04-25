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
