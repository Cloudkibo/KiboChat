/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const LiveChatModel = require('./liveChat.model')

exports.findOneFbMessageObject = (messageId) => {
  return LiveChatModel.findOne({_id: messageId})
    .exec()
}

exports.findAllFbMessageObject = () => {
  return LiveChatModel.find({})
    .exec()
}

exports.findOneFbMessageObjectUsingQuery = (queryObject) => {
  return LiveChatModel.findOne(queryObject)
    .exec()
}

exports.findAllFbMessageObjectsUsingQuery = (queryObject) => {
  return LiveChatModel.find(queryObject).sort({datetime: -1})
    .exec()
}
exports.findAllFbMessageObjectsUsingQueryWithSortAndLimit = (queryObject, sortObject, limitNumber) => {
  return LiveChatModel.find(queryObject).sort(sortObject).limit(limitNumber)
    .exec()
}
exports.findFbMessageObjectUsingAggregate = (aggregateObject) => {
  return LiveChatModel.aggregate(aggregateObject)
    .exec()
}

exports.createFbMessageObject = (payload) => {
  let obj = new LiveChatModel(payload)
  return obj.save()
}

exports.updateFbMessageObject = (messageId, payload) => {
  return LiveChatModel.updateOne({_id: messageId}, payload)
    .exec()
}

exports.genericUpdateFbMessageObject = (query, updated, options) => {
  return LiveChatModel.update(query, updated, options)
    .exec()
}

exports.genericUpdateOneFbMessageObject = (query, updated) => {
  return LiveChatModel.updateOne(query, updated)
    .exec()
}
exports.genericFindByIdAndUpdate = (query, updated) => {
  return LiveChatModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}
exports.deleteFbMessageObject = (messageId) => {
  return LiveChatModel.deleteOne({_id: messageId})
    .exec()
}

exports.deleteFbMessageObjectUsingQuery = (query) => {
  return LiveChatModel.deleteOne(query)
    .exec()
}
