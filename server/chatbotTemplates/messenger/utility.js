const pdf = require('pdf-creator-node')
const fs = require('fs')
const path = require('path')
const config = require('../../config/environment/index')

exports.prepareInvalidResponse = function (chatbot, subscriber, message) {
  return new Promise(async (resolve, reject) => {
    try {
      let lastMessage = subscriber.lastMessageSentByBot
      lastMessage.text = `${message}\n\n${lastMessage.text}`
      delete lastMessage.gallery
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
    response.push({ text, componentType: 'text' })

    if (automationResponse.gallery && automationResponse.gallery.length > 0) {
      let cards = automationResponse.gallery.map(item => {
        return {
          image_url: item.image,
          title: item.title,
          subtitle: item.subtitle,
          buttons: [{
            title: 'Select Product',
            type: 'postback',
            payload: JSON.stringify({
              type: 'DYNAMIC',
              price: item.price,
              stock: item.stock,
              productName: item.productName,
              event: item.event,
              id: item.id,
              image: item.image
            })
          }]
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
            API: item.API
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
            event: item.event
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
  text = text.replace('__fullName__', subscriber.fullName)
  text = text.replace('__chatbotName__', chatbot.storeType)
  text = text.replace('__storeName__', 'CloudKibo Test Store')
  text = text.replace('__productName__', `*${selectedOption.productName || selectedOption.label}*`)
  return text
}

const generateInvoice = async (storeInfo, order) => {
  const html = fs.readFileSync(path.join(__dirname, '../chatbots/invoice_template.html'), 'utf8')
  const options = {
    format: 'A3',
    orientation: 'portrait',
    border: '10mm'
  }
  const document = {
    html: html,
    data: {
      shopName: storeInfo.name,
      orderId: order.id,
      date: order.date,
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items,
      totalPrice: order.totalPrice
    },
    path: `./invoices/${storeInfo.id}/order${order.id}.pdf`
  }
  await pdf.create(document, options)
  return {
    componentType: 'file',
    fileurl: {
      url: `${config.domain}/invoices/${storeInfo.id}/order${order.id}.pdf`
    },
    fileName: `order${order.id}.pdf`
  }
}

exports.prepareResponse = prepareResponse
exports.generateInvoice = generateInvoice
