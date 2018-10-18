/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const mongoose = require('mongoose')

exports.getSubscriberIds = function (subscribers) {
  let subscriberIds = []
  for (let i = 0; i < subscribers.length; i++) {
    subscriberIds.push(subscribers[i]._id)
  }
  return subscriberIds
}

exports.getSusbscribersPayload = function (subscribers, tags) {
  let subscribersPayload = subscribers
  for (let i = 0; i < subscribers.length; i++) {
    subscribersPayload[i].tags = []
    for (let j = 0; j < tags.length; j++) {
      if (subscribers[i]._id.toString() === tags[j].subscriberId.toString()) {
        subscribersPayload[i].tags.push(tags[j].tagId.tag)
      }
    }
  }
  return subscribersPayload
}

exports.getCriterias = function (body, companyUser) {
  let search = ''
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  if (!body.filter) {
    findCriteria = {
      companyId: mongoose.Types.ObjectId(companyUser.companyId),
      isEnabledByPage: true
    }
  } else {
    search = new RegExp('.*' + body.filter_criteria.search_value + '.*', 'i')
    findCriteria = {
      companyId: mongoose.Types.ObjectId(companyUser.companyId),
      isEnabledByPage: true,
      $or: [{firstName: {$regex: search}}, {lastName: {$regex: search}}],
      gender: body.filter_criteria.gender_value !== '' ? body.filter_criteria.gender_value : {$exists: true},
      locale: body.filter_criteria.locale_value !== '' ? body.filter_criteria.locale_value : {$exists: true},
      isSubscribed: body.filter_criteria.status_value !== '' ? body.filter_criteria.status_value : {$exists: true},
      pageId: body.filter_criteria.page_value !== '' ? mongoose.Types.ObjectId(body.filter_criteria.page_value) : {$exists: true}
    }
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
      { $unwind: '$pageId' },
      { $match: findCriteria },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
      { $unwind: '$pageId' },
      { $match: { $and: [findCriteria, { _id: { $gt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
      { $unwind: '$pageId' },
      { $match: { $and: [findCriteria, { _id: { $lt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  let countCriteria = [
    {$match: findCriteria},
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {countCriteria: countCriteria, fetchCriteria: finalCriteria}
}
