
const logger = require('../../../components/logger')
const TAG = 'api/invitations/invitations.controller.js'
const callApi = require('../utility')

exports.index = function (req, res) {
  callApi.callApi('invitations', 'get', {}, req.headers.authorization)
    .then(invitations => {
      console.log('Invitations', invitations)
      res.status(200).json({
        status: 'success',
        payload: invitations
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.cancel = function (req, res) {
  callApi.callApi('invitations/cancel', 'post', {email: req.body.email}, req.headers.authorization)
    .then(result => {
      console.log('result', result)
      res.status(200).json({
        status: 'success',
        description: 'Invitation has been cancelled.'
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.invite = function (req, res) {
  callApi.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name}, req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts')
      logger.serverLog(TAG, result)
      res.status(200).json(result)
    })
    .catch((err) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts')
      logger.serverLog(TAG, err)
      res.status(500).json(err)
    })
}
