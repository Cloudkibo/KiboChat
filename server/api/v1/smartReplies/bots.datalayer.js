/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const BotsModel = require('./bots.model')

exports.findOneBotObject = (botId) => {
  return BotsModel.findOne({_id: botId})
    .exec()
}

exports.findAllBotObjects = () => {
  return BotsModel.find({})
    .exec()
}

exports.findOneBotObjectUsingQuery = (queryObject) => {
  return BotsModel.findOne(queryObject)
    .exec()
}

exports.findAllBotObjectsUsingQuery = (queryObject) => {
  return BotsModel.find(queryObject)
    .exec()
}

exports.findBotObjectsUsingAggregate = (aggregateObject) => {
  return BotsModel.aggregate(aggregateObject)
    .exec()
}

exports.createBotObject = (payload) => {
  let obj = new BotsModel(payload)
  return obj.save()
}

exports.updateBotObject = (botId, payload) => {
  return BotsModel.updateOne({_id: botId}, payload)
    .exec()
}

exports.genericUpdateBotObject = (query, updated, options) => {
  return BotsModel.update(query, updated, options)
    .exec()
}

exports.genericUpdateBotObject = (query, updated) => {
  return BotsModel.updateOne(query, updated)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return BotsModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}

exports.deleteBotObject = (botId) => {
  return BotsModel.deleteOne({_id: botId})
    .exec()
}

exports.deleteBotObjectUsingQuery = (query) => {
  return BotsModel.deleteOne(query)
    .exec()
}
