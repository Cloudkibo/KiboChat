exports.getCriterias = function (body, companyUser, seen) {
  let matchAggregate = { companyId: companyUser.companyId.toString(),
    'pageId': body.pageId === 'all' ? { $exists: true } : body.pageId,
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    'seen': seen ? true : { $exists: true }
  }
  return matchAggregate
}

exports.queryForSubscribers = function (body, companyUser, isSubscribed) {
  let query = [ {$match: { companyId: companyUser.companyId,
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    'pageId': body.pageId === 'all' ? { $exists: true } : body.pageId,
    isSubscribed: isSubscribed
  }
  },
  {$group: {
    _id: null,
    count: {$sum: 1}}
  }
  ]
  return query
}

exports.queryForSubscribersGraph = function (body, companyUser, isSubscribed) {
  let query = [ {$match: { companyId: companyUser.companyId,
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    'pageId': body.pageId === 'all' ? { $exists: true } : body.pageId,
    isSubscribed: isSubscribed
  }
  },
  {$group: {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}}
  }
  ]
  return query
}
