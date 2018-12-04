
const logicLayer = require('./template.logiclayer')
// todo temporary bot template for DNC, will be data driven
exports.getPoliticsBotTemplate = function (req, res) {
  let payload = logicLayer.getPoliticsBotTemplate()
  return res.status(200).json({status: 'success', payload: payload})
}
