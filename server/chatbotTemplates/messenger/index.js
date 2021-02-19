const { getChatbotResponse } = require('./automationLogic')
const { prepareInvalidResponse } = require('./utility')
const {
  clearShoppingCart,
  updateShoppingCartItem,
  removeShoppingCartItem,
  processCustomerEmail,
  processCustomerAddress
} = require('../logiclayer')

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
            response = await processOpendEndedResponse(lastMessage, inputData.text, subscriber, chatbot)
          } else {
            response = await getChatbotResponse(chatbot, inputData.text, subscriber)
          }
          break
        case 'quick_reply':
          if (inputData.selectedOption.event === 'cart-clear-success') {
            subscriber.shoppingCart = []
            clearShoppingCart(subscriber, 'messenger')
          }
          if (inputData.selectedOption.event === 'cart-remove-success') {
            removeShoppingCartItem(subscriber, inputData.selectedOption, 'messenger')
          }
          if (['cod', 'epayment'].includes(inputData.selectedOption.paymentMethod)) {
            subscriber.lastMessageSentByBot.paymentMethod = inputData.selectedOption.paymentMethod
          }
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
          productName: cartItem.product,
          price: cartItem.price,
          quantity: userInput,
          image: cartItem.image
        }
      }
      updateShoppingCartItem(subscriber, userInput, 'messenger')
      result = {validInput: true, option}
    }
  } else if (criteria.type === 'email') {
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(userInput)) {
      result = {validInput: false, message: 'Invalid email given. Please enter a valid email address.'}
    } else {
      processCustomerEmail(userInput, subscriber, chatbot, 'messenger')
      result = {validInput: true, option: {userInput}}
    }
  } else if (criteria.type === 'address') {
    processCustomerAddress(subscriber, chatbot, 'address1', userInput, 'messenger')
    result = {validInput: true, option: {userInput}}
  } else if (criteria.type === 'city') {
    processCustomerAddress(subscriber, chatbot, 'city', userInput, 'messenger')
    result = {validInput: true, option: {userInput}}
  } else if (criteria.type === 'zip') {
    if (!userInput) {
      result = {validInput: false, message: 'Invalid zip code given. Please enter a valid zip code.'}
    } else {
      processCustomerAddress(subscriber, chatbot, 'zip', userInput, 'messenger')
      result = {validInput: true, option: {userInput}}
    }
  } else if (criteria.type === 'country') {
    processCustomerAddress(subscriber, chatbot, 'country', userInput, 'messenger')
    result = {validInput: true, option: {userInput}}
  }
  return result
}
