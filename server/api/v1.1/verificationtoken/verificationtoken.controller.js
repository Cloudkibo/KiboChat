
// Get a single verificationtoken
const utility = require('../utility')

exports.resend = function (req, res) {
  utility.callApi(`verificationtoken/resend`, 'get', {}, 'accounts', req.headers.authorization)
    .then(response => {
      console.log('response in resend function', response)
      res.status(201).json({ status: 'success', description: 'Verification email has been sent' })
    })
    .catch(err => { return res.status(500).json({status: 'failed', description: 'Internal Server Error ' + err}) })
}
