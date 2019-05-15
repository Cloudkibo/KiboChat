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
        value: ''
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
          if (tagIds.includes(tags[j].tagId._id.toString())) {
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
  console.log('getting criterias')
  let search = ''
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  if (!req.body.filter) {
    findCriteria = {
      companyId: req.user.companyId
    }
  } else {
    console.log('filter_criteria', req.body.filter_criteria)
    search = '.*' + req.body.filter_criteria.search_value + '.*'
    findCriteria = {
      fullName: {$regex: search, $options: 'i'},
      gender: req.body.filter_criteria.gender_value !== '' ? req.body.filter_criteria.gender_value : {$exists: true},
      locale: req.body.filter_criteria.locale_value !== '' ? req.body.filter_criteria.locale_value : {$exists: true},
      isSubscribed: req.body.filter_criteria.status_value !== '' ? req.body.filter_criteria.status_value : {$exists: true},
      pageId: req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true}
    }
    if (req.body.filter_criteria.tag_value) {
      console.log('tag_value', req.body.filter_criteria.tag_value)
      findCriteria['tags_subscriber.tagId'] = { $in: tagIDs }
    }
    console.log(`findCriteria  ${JSON.stringify(findCriteria)}`)
  }
  let temp = JSON.parse(JSON.stringify(findCriteria))
  temp['pageId._id'] = temp.pageId
  temp['pageId.connected'] = true

  let countCriteria = [
    { $match: {companyId: req.user.companyId} },
    { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
    { $unwind: '$pageId' },
    { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } },
    { $project: {
      'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
      'firstName': 1,
      'lastName': 1,
      'profilePic': 1,
      'companyId': 1,
      'gender': 1,
      'locale': 1,
      'isSubscribed': 1,
      'pageId': 1,
      'datetime': 1,
      'timezone': 1,
      'senderId': 1,
      '_id': 1,
      'tags_subscriber': 1
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
    console.log('temp match', temp)
    finalCriteria = [
      { $match: {companyId: req.user.companyId} },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: temp },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
    console.log(`finalCriteria ${JSON.stringify(finalCriteria)}`)
  } else if (req.body.first_page === 'next') {
    recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: { $and: [temp, { _id: { $lt: req.body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  } else if (req.body.first_page === 'previous') {
    recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId' } },
      { $unwind: '$pageId' },
      { $lookup: { from: 'tags_subscribers', localField: '_id', foreignField: 'subscriberId', as: 'tags_subscriber' } },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: { $and: [temp, { _id: { $gt: req.body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
