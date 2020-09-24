const { callApi } = require('../../api/v1/utility')

exports.handleIncomingMessage = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'twilio.accountSID': body.AccountSid})
      .then(company => { resolve(company) })
      .catch(err => { reject(err) })
  })
}
