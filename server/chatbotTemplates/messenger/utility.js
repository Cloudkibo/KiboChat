exports.prepareInvalidResponse = function (chatbot, subscriber, message) {
  return new Promise(async (resolve, reject) => {
    try {
      let lastMessage = subscriber.lastMessageSentByBot
      lastMessage.text = `${message}\n\n${lastMessage.text}`
      const response = await prepareResponse(chatbot, subscriber, lastMessage)
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

function prepareResponse (chatbot, subscriber, automationResponse, selectedOption) {
  return new Promise((resolve, reject) => {
    let response = []
    let text = ''
    let quickReplies = []
    automationResponse.options = automationResponse.options || []
    if (automationResponse.options === 'PRODUCTS_NOT_FOUND') {
      text = `No products found!\n\n${prepareText(automationResponse.text, chatbot, subscriber)}`
    } else {
      text = prepareText(automationResponse.text, chatbot, subscriber, selectedOption)
    }

    if (automationResponse.textButtons && automationResponse.textButtons.length > 0) {
      const buttons = automationResponse.textButtons.map(item => {
        return {
          title: item.title,
          type: 'postback',
          payload: JSON.stringify({type: 'DYNAMIC', ...item.payload})
        }
      })
      response.push({ text, componentType: 'text', buttons })
    } else {
      response.push({ text, componentType: 'text' })
    }

    if (automationResponse.gallery && automationResponse.gallery.length > 0) {
      let cards = automationResponse.gallery.map(item => {
        let buttons = []
        if (item.buttons && item.buttons.length > 0) {
          buttons = item.buttons.map(button => {
            return {
              title: button.title,
              type: 'postback',
              payload: JSON.stringify({type: 'DYNAMIC', ...button.payload})
            }
          })
        }
        return {
          image_url: item.image,
          title: item.title,
          subtitle: item.subtitle,
          buttons
        }
      })
      response.push({
        componentType: 'gallery',
        cards
      })
    } else if (automationResponse.payload && automationResponse.payload.componentType) {
      response.push(automationResponse.payload)
    } else if (Array.isArray(automationResponse.options) && automationResponse.options.length > 0) {
      automationResponse.options.forEach((item, i) => {
        quickReplies.push({
          content_type: 'text',
          title: item.label,
          payload: JSON.stringify({
            event: item.event,
            id: item.id,
            nextPage: item.nextPage,
            API: item.API,
            paymentMethod: item.paymentMethod,
            orderId: item.orderId,
            isOrderFulFilled: item.isOrderFulFilled
          })
        })
      })
    }

    if (automationResponse.otherOptions && automationResponse.otherOptions.length > 0) {
      automationResponse.otherOptions.forEach((item, i) => {
        quickReplies.push({
          content_type: 'text',
          title: item.label,
          payload: JSON.stringify({
            event: item.event,
            productName: item.productName,
            id: item.id,
            price: item.price,
            stock: item.stock,
            quantity: item.quantity
          })
        })
      })
    }

    response[response.length - 1].quickReplies = quickReplies

    console.log('final payload', response)

    resolve({payload: response})
  })
}

function prepareText (text, chatbot, subscriber, selectedOption = {}) {
  text = text.replace('__fullName__', subscriber.firstName)
  text = text.replace('__chatbotName__', chatbot.storeType)
  text = text.replace('__storeName__', 'CloudKibo Test Store')
  text = text.replace('__productName__', `*${selectedOption.productName || selectedOption.label}*`)
  return text
}

exports.prepareResponse = prepareResponse
