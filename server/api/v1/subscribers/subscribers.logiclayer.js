/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
exports.getSubscriberIds = function (subscribers) {
  let subscriberIds = []
  for (let i = 0; i < subscribers.length; i++) {
    subscriberIds.push(subscribers[i]._id)
  }
  return subscriberIds
}
exports.getFinalPayload = (subscribers, customFields, customFieldSubscribers) => {
  let subscribersPayload = subscribers
  let data = {}
  for (let i = 0; i < subscribers.length; i++) {
    subscribersPayload[i].customFields = []
    for (let j = 0; j < customFields.length; j++) {
      data = {
        _id: customFields[j]._id,
        name: customFields[j].name,
        type: customFields[j].type,
        value: '',
        default: customFields[j].default
      }
      for (let k = 0; k < customFieldSubscribers.length; k++) {
        if (customFieldSubscribers[k].subscriberId._id === subscribers[i]._id && customFieldSubscribers[k].customFieldId._id === customFields[j]._id) {
          data.value = customFieldSubscribers[k].value
        }
      }
      subscribersPayload[i].customFields.push(data)
    }
  }
  return subscribersPayload
}
exports.getSusbscribersPayload = function (subscribers, tags, tagIds, tagValue) {
  let subscribersPayload = subscribers
  let filteredTagSubscribers = []
  for (let i = 0; i < subscribers.length; i++) {
    subscribersPayload[i].tags = []
    var isTaggedSubscriber = false
    for (let j = 0; j < tags.length; j++) {
      if (tags[j].tagId) {
        if (subscribers[i]._id.toString() === tags[j].subscriberId._id.toString()) {
          if (tagIds && tagIds.length !== 0 && tagIds.includes(tags[j].tagId._id.toString())) {
            isTaggedSubscriber = true
          }
          subscribersPayload[i].tags.push(tags[j].tagId.tag)
        }
      }
    }
    if (isTaggedSubscriber) {
      filteredTagSubscribers.push(subscribersPayload[i])
    }
  }
  if (tagValue && tagValue !== '') {
    return filteredTagSubscribers
  }
  return subscribersPayload
}

exports.getCriterias = function (req, tagIDs) {
  let search = ''
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  if (!req.body.filter) {
    findCriteria = {
      companyId: req.user.companyId
    }
  } else {
    search = '.*' + req.body.filter_criteria.search_value + '.*'
    findCriteria = {
      fullName: {$regex: search, $options: 'i'},
      gender: req.body.filter_criteria.gender_value !== '' ? req.body.filter_criteria.gender_value : {$exists: true},
      locale: req.body.filter_criteria.locale_value !== '' ? req.body.filter_criteria.locale_value : {$exists: true},
      isSubscribed: req.body.filter_criteria.status_value !== '' ? req.body.filter_criteria.status_value : {$exists: true},
      pageId: req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
      source: req.body.filter_criteria.source_value !== '' ? req.body.filter_criteria.source_value : {$exists: true}
    }
    if (req.body.filter_criteria.tag_value) {
      findCriteria['tags_subscriber.tagId'] = { $in: tagIDs }
    }
  }
  let temp = JSON.parse(JSON.stringify(findCriteria))
  temp['pageId._id'] = temp.pageId
  temp['pageId.connected'] = true

  let countCriteria = [
    { $match: {companyId: req.user.companyId, completeInfo: true} },
    { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
    { $unwind: '$pageId' },
    // { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } },
    { $project: {
      'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
      'firstName': 1,
      'lastName': 1,
      'source': 1,
      'profilePic': 1,
      'companyId': 1,
      'gender': 1,
      'locale': 1,
      'isSubscribed': 1,
      'pageId': 1,
      'datetime': 1,
      'timezone': 1,
      'senderId': 1,
      'siteInfo': 1,
      '_id': 1,
      'unSubscribedBy': 1
    }},
    { $match: temp },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  // findCriteria is for the count
  // here temp is the findcriteria for Payload
  delete temp.pageId
  if (req.body.first_page === 'first') {
    if (req.body.current_page) {
      recordsToSkip = Math.abs(req.body.current_page * req.body.number_of_records)
    }
    finalCriteria = [
      { $match: {companyId: req.user.companyId, completeInfo: true} },
      { $sort: { datetime: -1 } },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'source': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        'siteInfo': 1,
        '_id': 1,
        'unSubscribedBy': 1
      }},
      { $match: temp },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } }
    ]
  } else if (req.body.first_page === 'next') {
    recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    finalCriteria = [
      { $match: {companyId: req.user.companyId, completeInfo: true} },
      { $sort: { datetime: -1 } },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'source': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        'siteInfo': 1,
        '_id': 1,
        'unSubscribedBy': 1
      }},
      { $match: { $and: [temp, { _id: { $lt: req.body.last_id } }] } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } }
    ]
  } else if (req.body.first_page === 'previous') {
    recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    finalCriteria = [
      { $match: {companyId: req.user.companyId, completeInfo: true} },
      { $sort: { datetime: -1 } },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'source': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        'siteInfo': 1,
        '_id': 1,
        'unSubscribedBy': 1
      }},
      { $match: { $and: [temp, { _id: { $gt: req.body.last_id } }] } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}

exports.getCriteriasTags = function (req, tagIDs) {
  let search = ''
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  search = '.*' + req.body.filter_criteria.search_value + '.*'
  findCriteria = {
    'fullName': {$regex: search, $options: 'i'},
    'Subscribers.gender': req.body.filter_criteria.gender_value !== '' ? req.body.filter_criteria.gender_value : {$exists: true},
    'Subscribers.locale': req.body.filter_criteria.locale_value !== '' ? req.body.filter_criteria.locale_value : {$exists: true},
    'Subscribers.isSubscribed': req.body.filter_criteria.status_value !== '' ? req.body.filter_criteria.status_value : {$exists: true},
    'Subscribers.pageId': req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
    'Subscribers.source': req.body.filter_criteria.source_value !== '' ? req.body.filter_criteria.source_value : {$exists: true}
  }

  let countCriteria = [
    { $match: {companyId: req.user.companyId, 'tagId': {$in: tagIDs}} },
    { $lookup: { from: 'subscribers', localField: 'subscriberId', foreignField: '_id', as: 'Subscribers' } },
    { $unwind: '$Subscribers' },
    { $project: {
      'fullName': { '$concat': [ '$Subscribers.firstName', ' ', '$Subscribers.lastName' ] },
      'Subscribers': 1
    }},
    {$match: findCriteria},
    { $lookup: { from: 'pages', localField: 'Subscribers.pageId', foreignField: '_id', as: 'pageId' } },
    { $unwind: '$pageId' },
    { $group: { _id: null, count: { $sum: 1 } } }

  ]
  if (req.body.first_page === 'first') {
    if (req.body.current_page) {
      recordsToSkip = Math.abs(req.body.current_page * req.body.number_of_records)
    }
    finalCriteria = [
      { $match: {companyId: req.user.companyId, 'tagId': {$in: tagIDs}} },
      { $lookup: { from: 'subscribers', localField: 'subscriberId', foreignField: '_id', as: 'Subscribers' } },
      { $unwind: '$Subscribers' },
      {$sort: { 'Subscribers.datetime': -1 }},
      { $project: {
        'fullName': { '$concat': [ '$Subscribers.firstName', ' ', '$Subscribers.lastName' ] },
        'Subscribers': 1
      }},
      {$match: findCriteria},
      { $lookup: { from: 'pages', localField: 'Subscribers.pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  } else if (req.body.first_page === 'next') {
    recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    finalCriteria = [
      { $match: {companyId: req.user.companyId, 'tagId': {$in: tagIDs}} },
      { $lookup: { from: 'subscribers', localField: 'subscriberId', foreignField: '_id', as: 'Subscribers' } },
      { $unwind: '$Subscribers' },
      {$sort: { 'Subscribers.datetime': -1 }},
      { $project: {
        'fullName': { '$concat': [ '$Subscribers.firstName', ' ', '$Subscribers.lastName' ] },
        'Subscribers': 1
      }},
      { $match: { $and: [findCriteria, { 'Subscribers._id': { $lt: req.body.last_id } }] } },
      { $lookup: { from: 'pages', localField: 'Subscribers.pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  } else if (req.body.first_page === 'previous') {
    recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    finalCriteria = [
      { $match: {companyId: req.user.companyId, 'tagId': {$in: tagIDs}} },
      { $lookup: { from: 'subscribers', localField: 'subscriberId', foreignField: '_id', as: 'Subscribers' } },
      { $unwind: '$Subscribers' },
      {$sort: { 'Subscribers.datetime': -1 }},
      { $project: {
        'fullName': { '$concat': [ '$Subscribers.firstName', ' ', '$Subscribers.lastName' ] },
        'Subscribers': 1
      }},
      { $match: { $and: [findCriteria, { 'Subscribers._id': { $gt: req.body.last_id } }] } },
      { $lookup: { from: 'pages', localField: 'Subscribers.pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
exports.getCountCriteria = (body, companyId, tagIds) => {
  return new Promise((resolve, reject) => {
    let criteria = []
    let matchCriteria = {
      companyId,
      isSubscribed: true,
      completeInfo: true
    }
    if (body.genderValue) matchCriteria['gender'] = {$in: body.genderValue}
    if (body.localeValue) matchCriteria['locale'] = {$in: body.localeValue}
    criteria.push({$match: matchCriteria})
    criteria.push({
      $lookup: {
        from: 'pages',
        localField: 'pageId',
        foreignField: '_id',
        as: 'pageId'
      }
    })
    criteria.push({$unwind: '$pageId'})
    if (body.pageValue) {
      criteria.push({$match: {'pageId._id': {$in: body.pageValue}, 'pageId.connected': true}})
    } else {
      criteria.push({$match: {'pageId.connected': true}})
    }
    if (tagIds) {
      criteria.push({
        $lookup: {
          from: 'tags_subscribers',
          localField: '_id',
          foreignField: 'subscriberId',
          as: 'tags_subscriber'
        }
      })
      criteria.push({$unwind: '$tags_subscriber'})
      criteria.push({$match: {'tags_subscriber.tagId': {$in: tagIds}}})
    }
    criteria.push({$group: {_id: null, count: {$sum: 1}}})
    resolve(criteria)
  })
}
