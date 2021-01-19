const { callApi } = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = '/chatbotTemplates/index.js'

const { prepareResponse, prepareInvalidResponse } = require('./utility')

exports.getChatbotResponse = function (userInput, vertical, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = { userInput, vertical, subscriberId: subscriber._id }
      const automationResponse = await callApi('getChatbotResponse', 'post', data, 'kiboautomation')
      let chatbotResponse = ''

      if (automationResponse.type === 'fallback') {
        chatbotResponse = await prepareInvalidResponse(subscriber, automationResponse.text)
      } else {
        chatbotResponse = await prepareResponse(subscriber, automationResponse)
      }
      resolve({chatbotResponse, automationResponse})
    } catch (err) {
      reject(err)
    }
  })
}
