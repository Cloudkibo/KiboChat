/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/

exports.removeDuplicates = function (pages) {
  let pagesToSend = []
  let connectedPages = pages.filter(page => page.connected === true)
  for (let i = 0; i < pages.length; i++) {
    if (!exists(pagesToSend, pages[i].pageId)) {
      if (connectedPages.map((cp) => cp.pageId).indexOf(pages[i].pageId) !== -1) {
        pages[i].connected = true
        pagesToSend.push(pages[i])
      } else {
        pagesToSend.push(pages[i])
      }
    }
  }
  return pagesToSend
}

exports.getCriterias = function (body, companyUser) {
  let search = ''
  let findCriteria = {
    companyId: companyUser.companyId,
    connected: true}
  let finalCriteria = {}
  let recordsToSkip = 0
  if (body.filter) {
    search = '.*' + body.filter_criteria.search_value + '.*'
    findCriteria = Object.assign(findCriteria, {pageName: body.filter_criteria.search_value !== '' ? {$regex: search, $options: 'i'} : {$exists: true}})
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs((body.requested_page * body.number_of_records) - body.number_of_records)
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
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

function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].pageId === content) {
      return true
    }
  }
  return false
}

exports.appendSubUnsub = (pages) => {
  let pagesPayload = []
  for (let i = 0; i < pages.length; i++) {
    pagesPayload.push(pages[i])
    pagesPayload[i].subscribers = 0
    pagesPayload[i].unsubscribes = 0
  }
  return pagesPayload
}

exports.appendSubscribersCount = (pages, gotSubscribersCount) => {
  let pagesPayload = pages
  for (let i = 0; i < pagesPayload.length; i++) {
    for (let j = 0; j < gotSubscribersCount.length; j++) {
      if (pagesPayload[i]._id.toString() ===
        gotSubscribersCount[j]._id.pageId.toString()) {
        pagesPayload[i].subscribers = gotSubscribersCount[j].count
      }
    }
  }
  return pagesPayload
}

exports.appendUnsubscribesCount = (pages, gotUnSubscribersCount) => {
  let pagesPayload = pages
  for (let i = 0; i < pagesPayload.length; i++) {
    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
      if (pagesPayload[i]._id.toString() ===
        gotUnSubscribersCount[j]._id.pageId.toString()) {
        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
      }
    }
  }
  return pagesPayload
}
