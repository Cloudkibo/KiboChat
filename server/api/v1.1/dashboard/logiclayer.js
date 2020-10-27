exports.getCriterias = function (body, companyUser, seen) {
  let matchAggregate = { company_id: companyUser.companyId.toString(),
    'page_id': body.pageId === 'all' ? { $exists: true } : body.pageId,
    'request_time': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    }
  }
  return matchAggregate
}

exports.queryForSubscribers = function (body, companyUser, isSubscribed, pageIds) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      completeInfo: true,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed,
      'pageId': body.pageId === 'all' ? {$in: pageIds} : body.pageId
    }
    },
    {$group: {
      _id: null,
      count: {$sum: 1}}
    }
  ]
  return query
}

exports.queryForSubscribersGraph = function (body, companyUser, isSubscribed, pageIds) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      completeInfo: true,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed,
      'pageId': body.pageId === 'all' ? {$in: pageIds} : body.pageId
    }
    },
    {$group: {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    },
    {$sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }}
  ]
  return query
}
