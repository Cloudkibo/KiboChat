const twilio = require('./twilio')
const { ActionTypes } = require('./constants')

const providers = [
  { key: 'twilio', value: twilio }
]

exports.smsMapper = (provider, action, data) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.GET_COMPANY:
      return provider.getCompany(data)
    default:
  }
}
