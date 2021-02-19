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
    automationResponse.options = automationResponse.options || []
    if (automationResponse.options === 'PRODUCTS_NOT_FOUND') {
      text = `No products found!\n\n${prepareText(automationResponse.text, chatbot, subscriber)}`
    } else {
      text = prepareText(automationResponse.text, chatbot, subscriber, selectedOption)
      if (automationResponse.options && automationResponse.options.length > 0) {
        text = `${text}\n`
        automationResponse.options.forEach((item, i) => {
          text = `${text}\n${convertToEmoji(item.code)} ${item.label}`
        })
      }
    }
    if (automationResponse.otherOptions && automationResponse.otherOptions.length > 0) {
      text = `${text}\n`
      automationResponse.otherOptions.forEach((item, i) => {
        text = `${text}\n*${item.code.toUpperCase()}* ${item.label}`
      })
    }
    response.push({ text, componentType: 'text' })

    if (automationResponse.gallery && automationResponse.gallery.length > 0) {
      automationResponse.gallery.forEach((item, i) => {
        response.push({ componentType: 'image', caption: item.subtitle, fileurl: item.image })
      })
    } else if (automationResponse.payload && automationResponse.payload.componentType) {
      response.push(automationResponse.payload)
    }

    resolve({payload: response})
  })
}

function prepareText (text, chatbot, subscriber, selectedOption = {}) {
  text = text.replace('__fullName__', subscriber.name)
  text = text.replace('__chatbotName__', chatbot.storeType)
  text = text.replace('__storeName__', 'CloudKibo Test Store')
  text = text.replace('__productName__', `*${selectedOption.productName || selectedOption.label}*`)
  return text
}

function convertToEmoji (num) {
  let stringNum = num + ''
  const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
  let emoji = ''
  for (let i = 0; i < stringNum.length; i++) {
    emoji += numbers[parseInt(stringNum.charAt(i))]
  }
  if (!emoji || emoji === 'undefined') {
    emoji = `*${num}*`
  }
  return emoji
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
exports.convertToEmoji = convertToEmoji
exports.generateInvoice = generateInvoice
