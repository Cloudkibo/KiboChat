const commerceLogic = require('./commerceLogic')

const { callKiboAutomation } = require('../kiboAutomation.layer')
const { prepareResponse, prepareInvalidResponse } = require('./utility')

exports.getChatbotResponse = function (chatbot, userInput, subscriber, selectedOption, isEvent, inputType = 'text') {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbotResponse = ''
      let automationResponse = ''
      if (userInput === '__viewmore') {
        // automationResponse = prepareViewMoreResponse(subscriber)
      } else {
        automationResponse = await callKiboAutomation(userInput, chatbot, subscriber, isEvent, inputType)
      }
      if (automationResponse.responseType === 'fallback') {
        chatbotResponse = await prepareInvalidResponse(chatbot, subscriber, automationResponse.text)
      } else {
        if (automationResponse.options === 'FROM_API' || automationResponse.showCard) {
          const response = await commerceLogic.callApi(automationResponse, selectedOption, chatbot, subscriber)
          const lastMessage = subscriber.lastMessageSentByBot
          if (response.options === 'PRODUCTS_NOT_FOUND') {
            automationResponse = {...lastMessage, options: 'PRODUCTS_NOT_FOUND', gallery: null}
          } else {
            automationResponse = {...automationResponse, ...response}
            if (lastMessage && lastMessage.event && lastMessage.openEndedResponse && automationResponse.openEndedResponse) {
              automationResponse.event = lastMessage.event
            }
            if (lastMessage && lastMessage.paymentMethod) {
              automationResponse.paymentMethod = lastMessage.paymentMethod
            }
          }
          if (response.options === 'FROM_API') {
            automationResponse.options = []
          }
        }
        chatbotResponse = await prepareResponse(chatbot, subscriber, automationResponse, selectedOption)
      }
      resolve({
        chatbotResponse,
        automationResponse: automationResponse.responseType === 'fallback' ? null : automationResponse
      })
    } catch (err) {
      reject(err)
    }
  })
}
