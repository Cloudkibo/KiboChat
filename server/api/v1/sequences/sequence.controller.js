const utility = require('../utility')

exports.allSequences = function (req, res) {
  utility.callApi(`sequenceMessaging/allSequences`, 'get', {}, req.headers.authorization, 'kiboengage')
    .then(sequences => {
      res.status(200).json({status: 'success', payload: sequences})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch sequences ${err}`})
    })
}
