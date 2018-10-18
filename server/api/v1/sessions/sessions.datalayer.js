const SessionModel = require('./sessions.model')

exports.findSessionsUsingQuery = (queryObject) => {
  return SessionModel.find(queryObject).populate('subscriber_id page_id')
    .exec()
}
exports.findOneSessionUsingQuery = (queryObject) => {
  return SessionModel.findOne(queryObject).populate('subscriber_id page_id')
    .exec()
}
exports.createSessionObject = (payload) => {
  let obj = new SessionModel(payload)
  return obj.save()
}
exports.updateSessionObject = (sessionId, payload) => {
  return SessionModel.updateOne({_id: sessionId}, payload)
    .exec()
}
exports.aggregate = (query) => {
  return SessionModel.aggregate(query)
    .exec()
}
