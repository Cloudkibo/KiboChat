const { callApi } = require('../api/v1.1/utility')

exports.callKiboAutomation = function (userInput, chatbot, subscriber, isEvent) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = {
        userInput,
        vertical: chatbot.vertical,
        subscriberId: subscriber._id,
        type: isEvent ? 'event' : 'text'
      }
      const automationResponse = await callApi('getChatbotResponse', 'post', data, 'kiboautomation')
      resolve(automationResponse)
    } catch (err) {
      reject(err)
    }
  })
}
