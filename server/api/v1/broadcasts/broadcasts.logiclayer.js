let _ = require('lodash')

exports.getCriterias = function (body, companyUser) {
  let search = ''
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.filter_criteria.search_value === '' && body.filter_criteria.type_value === '') {
    findCriteria = {
      companyId: companyUser.companyId,
      'datetime': body.filter_criteria.days !== '0' ? {
        $gte: startDate
      } : { $exists: true }
    }
  } else {
    search = new RegExp('.*' + body.filter_criteria.search_value + '.*', 'i')
    if (body.filter_criteria.type_value === 'miscellaneous') {
      findCriteria = {
        companyId: companyUser.companyId,
        'payload.1': { $exists: true },
        title: body.filter_criteria.search_value !== '' ? { $regex: search } : { $exists: true },
        'datetime': body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    } else {
      findCriteria = {
        companyId: companyUser.companyId,
        $and: [{'payload.0.componentType': body.filter_criteria.type_value !== '' ? body.filter_criteria.type_value : { $exists: true }}, {'payload.1': { $exists: false }}],
        title: body.filter_criteria.search_value !== '' ? { $regex: search } : { $exists: true },
        'datetime': body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    }
  }
  if (body.first_page === 'first') {
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
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: 1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {
    finalCriteria,
    countCriteria
  }
}
exports.ListFindCriteria = function (body) {
  let ListFindCriteria = {}
  ListFindCriteria = _.merge(ListFindCriteria,
    {
      _id: {
        $in: body.segmentationList
      }
    })
  return ListFindCriteria
}

exports.subsFindCriteriaForList = function (lists, page) {
  let subsFindCriteria = {pageId: page._id}
  let listData = []
  if (lists.length > 1) {
    for (let i = 0; i < lists.length; i++) {
      for (let j = 0; j < lists[i].content.length; j++) {
        if (exists(listData, lists[i].content[j]) === false) {
          listData.push(lists[i].content[j])
        }
      }
    }
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: listData
      }
    })
  } else {
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: lists[0].content
      }
    })
  }
  return subsFindCriteria
}
exports.subsFindCriteria = function (body, page) {
  let subscriberFindCriteria = {pageId: page._id, isSubscribed: true}
  if (body.isSegmented) {
    if (body.segmentationGender.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria,
        {
          gender: {
            $in: body.segmentationGender
          }
        })
    }
    if (body.segmentationLocale.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria, {
        locale: {
          $in: body.segmentationLocale
        }
      })
    }
  }
  return subscriberFindCriteria
}
function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (JSON.stringify(list[i]) === JSON.stringify(content)) {
      return true
    }
  }
  return false
}
