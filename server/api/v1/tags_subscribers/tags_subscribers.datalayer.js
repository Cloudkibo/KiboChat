const TagSubscribers = require('./tags_subscribers.model')

exports.genericfind = (query) => {
  return TagSubscribers.find(query).populate('tagId subscriberId companyId')
    .exec()
}


exports.genericRemove = (query) => {
  return TagSubscribers.remove(query)
    .exec()
}