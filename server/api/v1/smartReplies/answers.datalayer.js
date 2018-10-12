/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const AnswersModel = require('./answers.model')

exports.findOneAnswerObject = (answerId) => {
  return AnswersModel.findOne({_id: answerId})
    .exec()
}

exports.findAllAnswerObjects = () => {
  return AnswersModel.find({})
    .exec()
}

exports.findOneAnswerObjectUsingQuery = (queryObject) => {
  return AnswersModel.findOne(queryObject)
    .exec()
}

exports.findAllAnswerObjectsUsingQuery = (queryObject) => {
  return AnswersModel.find(queryObject)
    .exec()
}

exports.findAnswerObjectsUsingAggregate = (aggregateObject) => {
  return AnswersModel.aggregate(aggregateObject)
    .exec()
}

exports.createAnswerObject = (payload) => {
  let obj = new AnswersModel(payload)
  return obj.save()
}

exports.updateAnswerObject = (answerId, payload) => {
  return AnswersModel.updateOne({_id: answerId}, payload)
    .exec()
}

exports.genericUpdateAnswerObject = (query, updated, options) => {
  return AnswersModel.update(query, updated, options)
    .exec()
}

exports.genericUpdateAnswerObject = (query, updated) => {
  return AnswersModel.updateOne(query, updated)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return AnswersModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}

exports.deleteAnswerObject = (answerId) => {
  return AnswersModel.deleteOne({_id: answerId})
    .exec()
}

exports.deleteAnswerObjectUsingQuery = (query) => {
  return AnswersModel.deleteOne(query)
    .exec()
}
