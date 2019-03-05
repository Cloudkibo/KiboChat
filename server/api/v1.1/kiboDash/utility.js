exports.getPageIdsFromTopPagesPayload = (payload) => {
  if (payload) {
    let pageIds = payload.map((item) => {
      return item.pageId
    })
    return pageIds
  } else {
    return false
  }
}

exports.mergePayload = (pages, aggregate) => {
  let merged = aggregate.map((item) => {
    pages.forEach(page => {
      if (page.pageId === item.pageId) {
        item.userId = page.userId
        item.userName = page.userId
        item.pagePic = page.pagePic
        item._id = page._id
        item.connected = page.connected
        item.likes = item.pageLikes
        item.subscribers = item.totalSubscribers
      }
    })
    return item
  })
  return merged
}
