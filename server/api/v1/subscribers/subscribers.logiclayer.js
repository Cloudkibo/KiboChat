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
exports.getSusbscribersPayload = function (subscribers, tags, tagValue) {
  let subscribersPayload = subscribers
  let filteredTagSubscribers = []
  for (let i = 0; i < subscribers.length; i++) {
    subscribersPayload[i].tags = []
    var isTaggedSubscriber = false
    for (let j = 0; j < tags.length; j++) {
      if (tags[j].tagId) {
        if (subscribers[i]._id.toString() === tags[j].subscriberId._id.toString()) {
          if (tagValue === tags[j].tagId._id.toString()) {
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

exports.getCriterias = function (body, companyUser) {
  console.log('getting criterias')
  let search = ''
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  if (!body.filter) {
    findCriteria = {
      companyId: companyUser.companyId
    }
  } else {
    console.log('filter_criteria', body.filter_criteria)
    search = '.*' + body.filter_criteria.search_value + '.*'
    findCriteria = {
      companyId: companyUser.companyId,
      fullName: {$regex: search, $options: 'i'},
      gender: body.filter_criteria.gender_value !== '' ? body.filter_criteria.gender_value : {$exists: true},
      locale: body.filter_criteria.locale_value !== '' ? body.filter_criteria.locale_value : {$exists: true},
      isSubscribed: body.filter_criteria.status_value !== '' ? body.filter_criteria.status_value : {$exists: true},
      pageId: body.filter_criteria.page_value !== '' ? body.filter_criteria.page_value : {$exists: true}
      // 'tags_subscriber.tagId': body.filter_criteria.tag_value
    }
    if (body.filter_criteria.tag_value) {
      console.log('tag_value', body.filter_criteria.tag_value)
      findCriteria['tags_subscriber'] = {$elemMatch: {tagId: body.filter_criteria.tag_value}}
    }
    console.log(`findCriteria  ${JSON.stringify(findCriteria)}`)
  }
  let temp = JSON.parse(JSON.stringify(findCriteria))
  temp['pageId._id'] = temp.pageId
  temp['pageId.connected'] = true

  let countCriteria = [
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
  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
    console.log('temp match', temp)
    finalCriteria = [
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
      { $limit: body.number_of_records }
    ]
    console.log(`finalCriteria ${JSON.stringify(finalCriteria)}`)
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
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
      { $match: { $and: [temp, { _id: { $lt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
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
      { $match: { $and: [temp, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
