
const logger = require('../../../components/logger')
const TAG = 'api/invitations/invitations.controller.js'
const callApi = require('../utility')

exports.index = function (req, res) {
  callApi.callApi('invitations', 'get', {}, 'accounts', req.headers.authorization)
    .then(invitations => {
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
  callApi.callApi('invitations/cancel', 'post', {email: req.body.email}, 'accounts', req.headers.authorization)
    .then(result => {
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
  callApi.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name})
    .then((result) => {
      res.status(200).json(result)
    })
    .catch((err) => {
      const message = err || 'result from invite endpoint accounts'
      logger.serverLog(message, `${TAG}: exports.invite`, req.body, {}, 'error')
      res.status(500).json(err)
    })
}
