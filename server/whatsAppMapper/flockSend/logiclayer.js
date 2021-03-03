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
      MessageObject.language = body.payload.templateCode
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
      template.code = flockSendTemplates[i].localizations[0].language
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
    language: data.payload.templateCode
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
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{order_ID}},{{order_status_url}},{{support_number}}',
        text: 'Hi {{customer_name}},\nThank you for your purchase of {{order_value}} from {{shop_name}}. Your order is getting ready and we will notify you when it has been shipped. You can view your order here 👉 (Order ID {{order_ID}}) {{order_status_url}}\n\nChat with customer support at: https://wa.me/{{support_number}}',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {
        name: 'order_confirmation',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{order_ID}},{{order_status_url}},{{support_number}}',
        text: 'السلام_عليكم {{customer_name}}،\n{{shop_name}} سے {{order_value}}  کی خریداری کے لئے آپ کا شکریہ۔ آپ کا آرڈر تیار ہو رہا ہے اور جب یہ بھیج دیا جائےگا تو ہم آپ کو مطلع کریں گے۔ آپ اپنا آرڈر یہاں دیکھ سکتے ہیں  👈 {{order_id}} {{order_status_url}}\n\nکسٹمر سپورٹ کے ساتھ اس لنک پر رابطہ کریں: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ur'
      },
      arabic: {
        name: 'order_confirmation',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{order_ID}},{{order_status_url}},{{support_number}}',
        text: 'مرحبا {{customer_name}}،\nشكرا على شرائك بقيمة {{order_value}} من {{shop_name}}. يتم تجهيز طلبك حالياً وسنقوم بإعلامك عند شحنه. يمكنك عرض طلبك هنا  👈 {{order_id}} {{order_status_url}}.\n\nالدردشة مع دعم العملاء على: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ar'
      }
    },
    ORDER_SHIPMENT: {
      english: {
        name: 'order_shipment',
        templateArguments: '{{customer_name}},{{shop_name}},{{tracking_ID}},{{tracking_url}},{{support_number}}',
        text: 'Hi {{customer_name}},\nYour order from {{shop_name}} has been shipped and is on its way. Track your shipment using this link 🚚 (tracking ID {{tracking_ID}}) {{tracking_url}}\n\nChat with customer support at: https://wa.me/{{support_number}}',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {
        name: 'order_shipment',
        templateArguments: '{{customer_name}},{{shop_name}},{{tracking_ID}},{{tracking_url}},{{support_number}}',
        text: 'السلام_عليكم {{customer_name}}،\n{{shop_name}} سے آپ کا آرڈر بھیج دیا گیا ہے اور وہ اپنے راستے میں ہے. ۔ اس لنک کو استعمال کرکے اپنی شپمنٹ کو ٹریک کریں۔ 🚚 {{tracking_ID}} {{tracking_url}}\n\nکسٹمر سپورٹ کے ساتھ اس لنک پر رابطہ کریں: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ur'
      },
      arabic: {
        name: 'order_shipment',
        templateArguments: '{{customer_name}},{{shop_name}},{{tracking_ID}},{{tracking_url}},{{support_number}}',
        text: 'مرحبا {{first_name}},\nتم شحن طلبك من متجر {{shop_name}} وهو في الطريق إليك. تتبع شحنتك باستخدام هذا الرابط 🚚 {{tracking_ID}} {{tracking_url}}\n\nالدردشة مع دعم العملاء على: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ar'
      }
    },
    ABANDONED_CART_RECOVERY: {
      english: {
        name: 'cart_recovery',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{checkout_url}},{{support_number}}',
        text: 'Hi {{customer_name}}, \nThe payment for your order of {{order_value}} from {{shop_name}} is still pending. Click on the link to complete the payment and confirm your order 👉 {{checkout_url}}.\n\nChat with customer support at: {{support_number}}',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {
        name: 'cart_recovery',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{checkout_url}},{{support_number}}',
        text: 'السلام_عليكم {{customer_name}}،\n{{shop_name}} سے آپ کے{{order_value}}  کے آرڈر کی ادائیگی ابھی باقی ہے۔ ادائیگی مکمل کرنے اور اپنے آرڈر کی تصدیق کے لئےاس لنک پر کلک کریں  👈 {{checkout_url}}.\n\nکسٹمر سپورٹ کے ساتھ اس لنک پر رابطہ کریں: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ur'
      },
      arabic: {
        name: 'cart_recovery',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{checkout_url}},{{support_number}}',
        text: 'مرحبًا{{customer_name}}،\nالدفع الخاص بطلبك بقيمة {{order_value}} من {{shop_name}} لا يزال معلقًا. انقر على الرابط لإكمال الدفع وتأكيد طلبك  👈 {{checkout_url}}.\n\nالدردشة مع دعم العملاء على: {{https://wa.me/{{support_number',
        type: 'TEXT',
        code: 'ar'
      }
    },
    COD_ORDER_CONFIRMATION: {
      english: {
        name: 'cod_order_confirmation',
        templateArguments: '{{customer_name}},{{order_value}},{{shop_name}},{{cod_confirmation_page_url}},{{support_number}}',
        text: 'Hi {{customer_name}},\nThank you for placing an order of {{order_value}} from {{shop_name}}.\n\nSince you paid using Cash on Delivery (COD) option, we need a confirmation from you before we process your order and ship it.\n\nClick on this link to confirm your order 👉 {{cod_confirmation_page_url}}\n\nChat with customer support at: https://wa.me/{{support_number}}',
        type: 'TEXT',
        code: 'en'
      },
      urdu: {},
      arabic: {}
    }
  }
  if (body.type && body.language) {
    return templates[body.type][body.language]
  } else if (body.type) {
    return templates[body.type]
  } else {
    return templates
  }
}
