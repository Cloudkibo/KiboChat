const { prepareInvalidResponse } = require('./utility')
const { getChatbotResponse } = require('./automationLogic')
const { SPECIALKEYWORDS, transformSpecialKeywords } = require('./specialKeywords')
const {
  clearShoppingCart,
  updateShoppingCartItem,
  removeShoppingCartItem,
  processCustomerEmail,
  processCustomerAddress
} = require('../logiclayer')

exports.handleWhatsAppInput = function (chatbot, inputData, subscriber) {
  return new Promise(async (resolve, reject) => {
    let response
    try {
      if (inputData.messageData.componentType === 'audio') {
        response = await getChatbotResponse(chatbot, inputData.messageData.fileurl.url || inputData.messageData.fileurl, subscriber, undefined, undefined, 'audio')
      } else {
        let inputText = inputData.messageData.text.toLowerCase()
        const lastMessage = subscriber.lastMessageSentByBot
        let isCode = false
        if (SPECIALKEYWORDS.includes(inputText)) {
          inputText = transformSpecialKeywords(inputText)
        }

        if (!isNaN(parseInt(inputText)) || (inputText.length === 1)) isCode = true

        if (isCode) {
          const option = await getOption(inputText, subscriber)
          if (['cod', 'epayment'].includes(option.paymentMethod)) {
            subscriber.lastMessageSentByBot.paymentMethod = option.paymentMethod
          }
          if (option.validCode) {
            response = await getChatbotResponse(chatbot, option.event, subscriber, option, true)
            if (option.event === 'cart-clear-success') {
              subscriber.shoppingCart = []
              clearShoppingCart(subscriber, 'whatsApp')
            }
            if (option.event === 'cart-remove-success') {
              removeShoppingCartItem(subscriber, option, 'whatsApp')
            }
          } else if (lastMessage && lastMessage.openEndedResponse) {
            response = await processOpendEndedResponse(lastMessage, inputText, subscriber, chatbot)
          } else {
            response = {
              chatbotResponse: await prepareInvalidResponse(chatbot, subscriber, 'You have entered an incorrect option.')
            }
          }
        } else {
          if (lastMessage && lastMessage.openEndedResponse) {
            response = await processOpendEndedResponse(lastMessage, inputText, subscriber, chatbot)
          } else {
            response = await getChatbotResponse(chatbot, inputText, subscriber)
          }
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

function processOpendEndedResponse (lastMessage, inputText, subscriber, chatbot) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = null
      if (lastMessage.validateUserInput) {
        const result = validateUserInput(inputText, subscriber, chatbot)
        if (result.validInput) {
          subscriber.lastMessageSentByBot.openEndedResponse = false
          response = await getChatbotResponse(chatbot, lastMessage.event, subscriber, result.option, true)
        } else {
          response = {
            chatbotResponse: await prepareInvalidResponse(chatbot, subscriber, result.message)
          }
        }
      } else {
        response = await getChatbotResponse(chatbot, lastMessage.event, subscriber, {userInput: inputText}, true)
      }
      resolve(response)
    } catch (err) { reject(err) }
  })
}

function validateUserInput (userInput, subscriber, chatbot) {
  const lastMessage = subscriber.lastMessageSentByBot
  let option = {}
  let result = {validInput: false, message: 'You have entered an incorrect input.'}
  const criteria = lastMessage.validationCriteria

  if (criteria.type === 'number') {
    userInput = parseInt(userInput)
    if (isNaN(userInput) || userInput < criteria.min) {
      result = {validInput: false, message: 'You have entered an invalid quantity.'}
    } else if (userInput > criteria.max) {
      result = {validInput: false, message: `Your requested quantity exceeds the stock available ${criteria.max}. Please enter a quantity less than ${criteria.max}.`}
    } else {
      const cartItem = subscriber.shoppingCart.find((item) => item.product_id === lastMessage.selectedProduct)
      if (cartItem) {
        option = {
          label: cartItem.product,
          price: cartItem.price,
          quantity: userInput,
          image: cartItem.image
        }
      }
      updateShoppingCartItem(subscriber, userInput, 'whatsApp')
      result = {validInput: true, option}
    }
  } else if (criteria.type === 'email') {
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(userInput)) {
      result = {validInput: false, message: 'Invalid email given. Please enter a valid email address.'}
    } else {
      processCustomerEmail(userInput, subscriber, chatbot, 'whatsApp')
      result = {validInput: true, option: {userInput}}
    }
  } else if (criteria.type === 'address') {
    processCustomerAddress(subscriber, chatbot, 'address1', userInput, 'whatsApp')
    result = {validInput: true, option: {userInput}}
  } else if (criteria.type === 'city') {
    processCustomerAddress(subscriber, chatbot, 'city', userInput, 'whatsApp')
    result = {validInput: true, option: {userInput}}
  } else if (criteria.type === 'zip') {
    if (!userInput) {
      result = {validInput: false, message: 'Invalid zip code given. Please enter a valid zip code.'}
    } else {
      processCustomerAddress(subscriber, chatbot, 'zip', userInput, 'whatsApp')
      result = {validInput: true, option: {userInput}}
    }
  } else if (criteria.type === 'country') {
    processCustomerAddress(subscriber, chatbot, 'country', userInput, 'whatsApp')
    result = {validInput: true, option: {userInput}}
  }
  return result
}
