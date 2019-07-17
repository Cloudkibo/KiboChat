const { callApi } = require('../utility')

exports.createFbMessageObject = (payload) => {
  return callApi(`livechat`, 'post', payload, 'kibochat')
}
