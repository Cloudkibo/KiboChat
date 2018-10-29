const SessionModel = require('./sessions.model')

exports.findSessionsUsingQuery = (queryObject) => {
  return SessionModel.find(queryObject)
    .exec()
}
exports.findOneSessionUsingQuery = (queryObject) => {
  return SessionModel.findOne(queryObject)
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
