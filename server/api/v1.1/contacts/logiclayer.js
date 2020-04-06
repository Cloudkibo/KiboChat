exports.getCriterias = function (body, companyUser) {
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    companyId: companyUser.companyId,
    name: body.search_value !== '' ? { $regex: '.*' + body.search_value + '.*', $options: 'i' } : { $exists: true },
    isSubscribed: body.status_value !== '' ? body.status_value : {$exists: true}
  }
  if (body.list_value !== '') {
    findCriteria.listIds = body.list_value === 'master' ? {$exists: false} : body.list_value
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
      { $sort: { datetime: -1 } },
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}

exports.preparePayload = function (body, companyUser, data, nameColumn, result) {
  let payload = {
    name: data[`${nameColumn}`],
    number: result,
    companyId: companyUser.companyId
  }
  return payload
}
