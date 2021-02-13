const commerceAPILayer = require('./commerceAPI.layer')

const { callApi } = require('../api/v1.1/utility')
const { prepareResponse, prepareInvalidResponse } = require('./utility')

exports.getChatbotResponse = function (chatbot, userInput, subscriber, selectedOption, isEvent) {
  return new Promise(async (resolve, reject) => {
    try {
      let chatbotResponse = ''
      let automationResponse = ''
      if (userInput === '__viewmore') {
        automationResponse = prepareViewMoreResponse(subscriber)
      } else {
        automationResponse = await callKiboAutomation(userInput, chatbot, subscriber, isEvent)
      }
      if (automationResponse.responseType === 'fallback') {
        chatbotResponse = await prepareInvalidResponse(chatbot, subscriber, automationResponse.text)
      } else {
        if (automationResponse.options === 'FROM_API' || automationResponse.showCard) {
          const response = await commerceAPILayer.callApi(automationResponse, selectedOption, chatbot, subscriber)
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
      console.log(err)
      reject(err)
    }
  })
}

function prepareViewMoreResponse (subscriber) {
  const lastMessage = subscriber.lastMessageSentByBot
  const viewMoreOption = lastMessage.options.find((item) => item.event === '__viewmore')
  return {
    responseType: 'matched',
    text: lastMessage.text,
    options: 'FROM_API',
    API: viewMoreOption.API,
    otherOptions: lastMessage.otherOptions,
    gallery: lastMessage.gallery,
    event: lastMessage.event,
    nextPage: viewMoreOption.nextPage
  }
}

function callKiboAutomation (userInput, chatbot, subscriber, isEvent) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = {
        userInput,
        vertical: chatbot.vertical,
        subscriberId: subscriber._id,
        type: isEvent ? 'event' : 'text'
      }
      console.log('data', data)
      const automationResponse = await callApi('getChatbotResponse', 'post', data, 'kiboautomation')
      resolve(automationResponse)
    } catch (err) {
      reject(err)
    }
  })
}

exports.callKiboAutomation = callKiboAutomation