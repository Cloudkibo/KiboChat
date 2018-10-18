const Notifications = require('./notifications.model')

exports.genericFind = (query) => {
  return Notifications.find(query).populate('agentId companyId')
    .exec()
}
exports.createNotificationObject = (payload) => {
  let obj = new Notifications(payload)
  return obj.save()
}
exports.updateOneNotification = (id, payload) => {
  return Notifications.updateOne({_id: id}, payload)
    .exec()
}
