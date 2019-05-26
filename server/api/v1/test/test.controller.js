// Web layer of this API node
const logger = require('../../../components/logger')
const TAG = '/api/v1/test/index.js'

exports.index = function (req, res) {
  res.status(200).json({status: 'success', payload: 'Hello World'})
}
