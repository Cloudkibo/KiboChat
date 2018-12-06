/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const UnansweredQuestionsModel = require('./unansweredQuestions.model')

exports.findOneUnansweredQuestionObject = (questionId) => {
  return UnansweredQuestionsModel.findOne({_id: questionId}).populate('botId')
    .exec()
}

exports.findAllUnansweredQuestionObjects = () => {
  return UnansweredQuestionsModel.find({}).populate('botId')
    .exec()
}

exports.findOneUnansweredQuestionObjectUsingQuery = (queryObject) => {
  return UnansweredQuestionsModel.findOne(queryObject).populate('botId')
    .exec()
}

exports.findAllUnansweredQuestionObjectsUsingQuery = (queryObject) => {
  return UnansweredQuestionsModel.find(queryObject).populate('botId')
    .exec()
}

exports.findUnansweredQuestionObjectsUsingAggregate = (aggregateObject) => {
  return UnansweredQuestionsModel.aggregate(aggregateObject)
    .exec()
}

exports.createUnansweredQuestionObject = (payload) => {
  let obj = new UnansweredQuestionsModel(payload)
  return obj.save()
}

exports.updateUnansweredQuestionObject = (questionId, payload) => {
  return UnansweredQuestionsModel.updateOne({_id: questionId}, payload)
    .exec()
}

exports.genericUpdateUnansweredQuestionObject = (query, updated, options) => {
  return UnansweredQuestionsModel.update(query, updated, options)
    .exec()
}

exports.genericUpdateUnansweredQuestionObject = (query, updated) => {
  return UnansweredQuestionsModel.updateOne(query, updated)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return UnansweredQuestionsModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}

exports.deleteUnansweredQuestionObject = (questionId) => {
  return UnansweredQuestionsModel.deleteOne({_id: questionId})
    .exec()
}

exports.deleteUnansweredQuestionObjectUsingQuery = (query) => {
  return UnansweredQuestionsModel.deleteOne(query)
    .exec()
}
