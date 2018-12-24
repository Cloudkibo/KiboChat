const MenuModel = require('./menu.model')

exports.findOneMenuObjectUsingQuery = (query) => {
  return MenuModel.findOne(query)
    .exec()
}
exports.findMenuObjectUsingQuery = (query) => {
  return MenuModel.find(query)
    .exec()
}
exports.updateOneMenuObjectUsingQuery = (query, updatedObject) => {
  return MenuModel.update(query, updatedObject)
    .exec()
}
