const { getChatbotResponse } = require('./automationLogic')

exports.handleMessengerInput = function (chatbot, event, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
      let response
      console.log('inputData', event)
      const lastMessage = subscriber.lastMessageSentByBot
      const inputData = processEvent(event)
      switch (inputData.type) {
        case 'text':
          if (lastMessage && lastMessage.openEndedResponse) {
            response = await getChatbotResponse(chatbot, lastMessage.event, subscriber, {userInput: inputData.text}, true)
          } else {
            response = await getChatbotResponse(chatbot, inputData.text, subscriber)
          }
          break
        case 'quick_reply':
          response = await getChatbotResponse(chatbot, inputData.selectedOption.event, subscriber, inputData.selectedOption, true)
          break
        case 'postback':
          response = await getChatbotResponse(chatbot, inputData.selectedOption.event, subscriber, inputData.selectedOption, true)
          break
        default:
      }
      resolve(response)
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

function processEvent (event) {
  let data = {}
  if (event.postback && event.postback.payload) {
    data = {
      type: 'postback',
      selectedOption: {
        ...JSON.parse(event.postback.payload)
      }
    }
  } else if (event.message && event.message.quick_reply) {
    const quickReply = event.message.quick_reply
    data = {
      type: 'quick_reply',
      selectedOption: {
        label: quickReply.text,
        ...JSON.parse(quickReply.payload)
      }
    }
  } else if (event.message && event.message.text) {
    data = {
      type: 'text',
      text: event.message.text.toLowerCase()
    }
  }
  return data
}
