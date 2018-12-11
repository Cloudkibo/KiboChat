const mongoose = require('mongoose')
let _ = require('lodash')

exports.getCriterias = function (body, companyUser) {
  let findCriteria = {
    companyId: mongoose.Types.ObjectId(companyUser.companyId)
  }
  let finalCriteria = {}
  let recordsToSkip = 0
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $sort: {_id: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {countCriteria: countCriteria, fetchCriteria: finalCriteria}
}

exports.getSubscriberCriteria = function (number, companyUser) {
  let findNumber = []
  let findPage = []
  for (let a = 0; a < number.length; a++) {
    findNumber.push(number[a].number)
    findPage.push(number[a].pageId)
  }
  let subscriberFindCriteria = {
    source: 'customer_matching',
    companyId: companyUser.companyId,
    isSubscribed: true
  }
  subscriberFindCriteria = _.merge(subscriberFindCriteria, {
    phoneNumber: {
      $in: findNumber
    },
    pageId: {
      $in: findPage
    }
  })
  return subscriberFindCriteria
}
exports.getContent = function (subscribers) {
  let temp = []
  for (let i = 0; i < subscribers.length; i++) {
    temp.push(subscribers[i]._id)
  }
  return temp
}
exports.pollResponseCriteria = function (polls) {
  let pollIds = []
  for (let i = 0; i < polls.length; i++) {
    pollIds.push(polls[i]._id)
  }
  let criteria = {pollId: {$in: pollIds}}
  return criteria
}
exports.respondedSubscribersCriteria = function (responses) {
  let respondedSubscribers = []
  for (let j = 0; j < responses.length; j++) {
    respondedSubscribers.push(responses[j].subscriberId)
  }
  let criteria = {_id: {$in: respondedSubscribers}}
  return criteria
}
exports.preparePayload = function (subscribers, responses) {
  let subscribersPayload = []
  for (let a = 0; a < subscribers.length; a++) {
    for (let b = 0; b < responses.length; b++) {
      if (JSON.stringify(subscribers[a]._id) === JSON.stringify(responses[b].subscriberId)) {
        subscribersPayload.push({
          _id: subscribers[a]._id,
          pageScopedId: subscribers[a].pageScopedId,
          firstName: subscribers[a].firstName,
          lastName: subscribers[a].lastName,
          locale: subscribers[a].locale,
          timezone: subscribers[a].timezone,
          email: subscribers[a].email,
          gender: subscribers[a].gender,
          senderId: subscribers[a].senderId,
          profilePic: subscribers[a].senderId,
          pageId: subscribers[a].pageId,
          phoneNumber: subscribers[a].phoneNumber,
          unSubscribedBy: subscribers[a].unSubscribedBy,
          companyId: subscribers[a].companyId,
          isSubscribed: subscribers[a].isSubscribed,
          isEnabledByPage: subscribers[a].isEnabledByPage,
          datetime: subscribers[a].datetime,
          dateReplied: responses[b].datetime,
          source: subscribers[a].source
        })
      }
    }
  }
  return subscribersPayload
}
