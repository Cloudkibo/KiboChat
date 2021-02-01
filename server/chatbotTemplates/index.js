const { prepareInvalidResponse } = require('./utility')
const { getChatbotResponse } = require('./kiboautomation.layer.js')
const { SPECIALKEYWORDS, transformSpecialKeywords } = require('./specialKeywords')
const { clearShoppingCart } = require('./commerceAPI.layer')

exports.handleUserInput = function (chatbot, inputData, subscriber, channel) {
  return new Promise(async (resolve, reject) => {
    try {
      let inputText = inputData.messageData.text.toLowerCase()
      let isCode = false
      let response

      if (SPECIALKEYWORDS.includes(inputText)) {
        inputText = transformSpecialKeywords(inputText)
      }

      if (!isNaN(parseInt(inputText)) || (inputText.length === 1)) isCode = true

      if (isCode) {
        const option = await getOption(inputText, subscriber)
        if (option.validCode) {
          response = await getChatbotResponse(chatbot, option.event, subscriber, option, true)
          if (option.event === 'cart-clear-success') {
            subscriber.shoppingCart = []
            clearShoppingCart(subscriber)
          }
        } else {
          response = {
            chatbotResponse: await prepareInvalidResponse(chatbot, subscriber, 'You have entered an incorrect option.')
          }
        }
      } else {
        const lastMessage = subscriber.lastMessageSentByBot
        if (lastMessage && lastMessage.openEndedResponse) {
          response = await getChatbotResponse(chatbot, lastMessage.event, subscriber, {userInput: inputText}, true)
        } else {
          response = await getChatbotResponse(chatbot, inputText, subscriber)
        }
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

function getOption (inputText, subscriber) {
  const lastMessage = subscriber.lastMessageSentByBot
  if (lastMessage) {
    let options = []
    if (lastMessage.options && lastMessage.options.length > 0 && Array.isArray(lastMessage.options)) {
      options = [...options, ...lastMessage.options.map((item) => item.code.toLowerCase())]
    } else {
      lastMessage.options = []
    }
    if (lastMessage.otherOptions && lastMessage.otherOptions.length > 0) {
      options = [...options, ...lastMessage.otherOptions.map((item) => item.code.toLowerCase())]
    } else {
      lastMessage.otherOptions = []
    }
    if (options.includes(inputText)) {
      const option = [...lastMessage.options, ...lastMessage.otherOptions].find((item) => item.code.toLowerCase() === inputText)
      return {...option, validCode: true}
    } else {
      return {validCode: false}
    }
  } else {
    return {validCode: false}
  }
}
