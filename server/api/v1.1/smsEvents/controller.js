const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1/smsEvents/controller.js'

exports.handleOrderStatus = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  callApi(`companyprofile/update`, 'put', {
    query: {_id: req.body.payload.orderId},
    newPayload: {'sms.accountType': req.body.payload.status === 'COMPLETE' ? 'approved' : 'failed'},
    options: {}})
    .then(data => {
    })
    .catch(error => {
      const message = error || 'Failed to fetch company'
      logger.serverLog(message, `${TAG}: exports.handleOrderStatus`, req.body, {user: req.user}, 'error')
    })
}
