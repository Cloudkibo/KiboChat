/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const WaitingSubscribersModel = require('./waitingSubscribers.model')

exports.findOneWaitingSubscriberObject = (subscriberId) => {
  return WaitingSubscribersModel.findOne({_id: subscriberId})
    .exec()
}

exports.findAllWaitingSubscriberObjects = () => {
  return WaitingSubscribersModel.find({})
    .exec()
}

exports.findOneWaitingSubscriberObjectUsingQuery = (queryObject) => {
  return WaitingSubscribersModel.findOne(queryObject)
    .exec()
}

exports.findAllWaitingSubscriberObjectsUsingQuery = (queryObject) => {
  return WaitingSubscribersModel.find(queryObject)
    .exec()
}

exports.findWaitingSubscriberObjectsUsingAggregate = (aggregateObject) => {
  return WaitingSubscribersModel.aggregate(aggregateObject)
    .exec()
}

exports.createWaitingSubscriberObject = (payload) => {
  let obj = new WaitingSubscribersModel(payload)
  return obj.save()
}

exports.updateWaitingSubscriberObject = (subscriberId, payload) => {
  return WaitingSubscribersModel.updateOne({_id: subscriberId}, payload)
    .exec()
}

exports.genericUpdateWaitingSubscriberObject = (query, updated, options) => {
  return WaitingSubscribersModel.update(query, updated, options)
    .exec()
}

exports.genericUpdateWaitingSubscriberObject = (query, updated) => {
  return WaitingSubscribersModel.updateOne(query, updated)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return WaitingSubscribersModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}

exports.deleteWaitingSubscriberObject = (subscriberId) => {
  return WaitingSubscribersModel.deleteOne({_id: subscriberId})
    .exec()
}

exports.deleteWaitingSubscriberObjectUsingQuery = (query) => {
  return WaitingSubscribersModel.deleteOne(query)
    .exec()
}
