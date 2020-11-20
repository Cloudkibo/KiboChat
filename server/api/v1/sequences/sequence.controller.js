const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sequences/sequence.controller.js'

exports.allSequences = function (req, res) {
  utility.callApi(`sequenceMessaging/allSequences`, 'get', {}, 'kiboengage', req.headers.authorization)
    .then(sequences => {
      res.status(200).json({status: 'success', payload: sequences})
    })
    .catch(err => {
      const message = err || 'Failed to fetch sequences'
      logger.serverLog(message, `${TAG}: exports.allSequences`, {}, {user: req.user}, 'error')
      res.status(500).json({status: 'failed', description: `Failed to fetch sequences ${err}`})
    })
}
