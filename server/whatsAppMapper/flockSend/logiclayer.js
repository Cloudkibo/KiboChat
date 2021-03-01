var path = require('path')
const { appendOptions } = require('../logiclayer')

exports.prepareSendMessagePayload = (body) => {
  let route = ''
  let MessageObject = {
    token: body.whatsApp.accessToken,
    number_details: JSON.stringify([
      { phone: body.recipientNumber }])
  }
  if (body.payload.componentType === 'text') {
    if (body.payload.templateName) {
      MessageObject.template_name = body.payload.templateName
      MessageObject.template_argument = body.payload.templateArguments
      MessageObject.language = 'en'
      route = 'hsm'
    } else {
      MessageObject.message = body.payload.text
      route = 'text'
    }
  } else if (body.payload.componentType === 'sticker' ||
    body.payload.componentType === 'image' ||
    body.payload.componentType === 'thumbsUp') {
    MessageObject.image = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.caption
    route = 'image'
  } else if (body.payload.componentType === 'video' || body.payload.componentType === 'gif') {
    MessageObject.video = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.caption
    route = 'video'
  } else if (body.payload.componentType === 'file') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.title = body.payload.fileName
    MessageObject.file = body.payload.fileurl.url || body.payload.fileurl
    route = 'file'
  } else if (body.payload.componentType === 'audio') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.audio = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.fileName
    route = 'audio'
  }
  return {
    MessageObject,
    route
  }
}

exports.prepareReceivedMessageData = (event) => {
  let payload = {}
  if (event.media_type === 'image') {
    payload = { componentType: 'image', fileurl: { url: event.media_link } }
    if (event.message !== '' && event.message !== 'image') {
      payload.caption = event.message
    }
  } else if (event.media_type === 'video') {
    payload = { componentType: 'video', fileurl: { url: event.media_link } }
    if (event.message !== '' && event.message !== 'video') {
      payload.caption = event.message
    }
  } else if (event.media_type === 'document') {
    payload = {
      componentType: 'file',
      fileurl: { url: event.media_link },
      fileName: event.message
    }
  } else if (event.media_type === 'audio' || event.media_type === 'voice') {
    payload = { componentType: 'audio', fileurl: { url: event.media_link } }
  } else if (event.media_type === 'location') {
    let coordinates = event.message.split(':')
    payload = {
      componentType: 'location',
      title: 'Pinned Location',
      payload: {
        coordinates: { lat: coordinates[1], long: coordinates[0] }
      }
    }
  } else if (event.media_type === 'contacts') {
    let parsed = event.message.split(':')
    payload = { componentType: 'contact', name: parsed[0], number: parsed[1] }
  } else if (event.media_type === 'text' && event.message !== '') {
    payload = { componentType: 'text', text: event.message }
  }
  return payload
}

exports.prepareTemplates = (flockSendTemplates) => {
  let templates = []
  for (let i = 0; i < flockSendTemplates.length; i++) {
    if (flockSendTemplates[i].localizations[0].status === 'APPROVED') {
      let template = {}
      template.name = flockSendTemplates[i].templateName
      let templateComponents = flockSendTemplates[i].localizations[0].components
      for (let j = 0; j < templateComponents.length; j++) {
        if (templateComponents[j].type === 'BODY') {
          template.type = 'TEXT'
          template.text = templateComponents[j].text
          let argumentsRegex = /{{[0-9]}}/g
          let templateArguments = template.text.match(argumentsRegex).join(',')
          template.templateArguments = templateArguments
          let regex = template.text.replace('.', '\\.')
          regex = regex.replace(argumentsRegex, '(.*)')
          template.regex = `^${regex}$`
        } else if (templateComponents[j].type === 'BUTTONS') {
          template.buttons = templateComponents[j].buttons.map(button => {
            return {
              title: button.text
            }
          })
        }
      }
      if (!template.buttons) {
        template.buttons = []
      }
      templates.push(template)
    }
  }
  return templates
}

exports.prepareInvitationPayload = (data) => {
  let contactNumbers = []
  data.numbers.map((c) => contactNumbers.push({ phone: c }))
  let MessageObject = {
    token: data.whatsApp.accessToken,
    number_details: JSON.stringify(contactNumbers),
    template_name: data.payload.templateName,
    template_argument: data.payload.templateArguments,
    language: 'en'
  }
  return MessageObject
}

exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    let route = ''
    let message = {
      token: company.whatsApp.accessToken,
      number_details: JSON.stringify([{phone: contact.number}])
    }
    if (payload.componentType === 'text') {
      message.message = payload.text + appendOptions(options)
      route = 'text'
    } else if (payload.componentType === 'image' || payload.mediaType === 'image') {
      message.image = payload.fileurl.url
      message.title = (payload.caption) ? payload.caption : undefined
      route = 'image'
    } else if (payload.componentType === 'video' || payload.mediaType === 'video') {
      message.video = payload.fileurl.url
      route = 'video'
    } else if (payload.componentType === 'file') {
      message.file = payload.fileurl.url
      route = 'file'
    } else if (payload.componentType === 'audio') {
      message.audio = payload.fileurl.url
      route = 'audio'
    } else if (payload.componentType === 'card') {
      message.message = payload.url
      route = 'text'
    }
    resolve({message, route})
  })
}
exports.prepareCommerceTemplates = (body) => {
  let templates = {
    ORDER_CONFIRMATION: {
      english: {
        name: 'order_confirmation',
        regex: '^Hi *(.*), thank you for your purchase of *(.*)* from *(.*)*. Your order is getting ready and we will notify you when it has been shipped. You can view your order here 👉 (Order ID *(.*)*) (.*)\n_Chat with customer support at: https://wa.me/(.*)_$',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{order_ID}},{{order_status_url}},{{support_number}}',
        text: 'Hi *{{customer_name}}*, thank you for your purchase of *{{order_value}}* from *{{shop_name}}*. Your order is getting ready and we will notify you when it has been shipped. You can view your order here 👉 (Order ID *{{order_ID}}*) {{order_status_url}}\n_Chat with customer support at: https://wa.me/{{support_number}}_',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {},
      arabic: {}
    },
    ORDER_SHIPMENT: {
      english: {
        name: 'order_shipment',
        regex: '^Hi (.*), your order from (.*) has been shipped and is on its way. Track your shipment using this link (.*) (.*)\n_Chat with customer support at: (.*)_$',
        templateArguments: '{{customer_name}},{{shop_name}},{{tracking_ID}},{{tracking_url}},{{supportNumber}}',
        text: 'Hi {{customer_name}}, your order from {{shop_name}} has been shipped and is on its way. Track your shipment using this link {{tracking_ID}} {{tracking_url}}\n_Chat with customer support at: {{support_number}}_',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {},
      arabic: {}
    },
    ABANDONED_CART_RECOVERY: {},
    COD_ORDER_CONFIRMATION: {}
  }
  if (body.type && body.language) {
    return templates[body.type][body.language]
  } else if (body.type) {
    return templates[body.type]
  } else {
    return templates
  }
}
