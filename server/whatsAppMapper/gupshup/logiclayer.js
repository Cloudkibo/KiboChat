const { appendOptions } = require('../logiclayer')

exports.prepareSendMessagePayload = (body) => {
  let route = 'msg'
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = body.recipientNumber.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let componentType = body.payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (body.payload.templateName) {
    let templateArguments = body.payload.templateArguments ? body.payload.templateArguments.split(',') : []
    let template = JSON.stringify({
      id: body.payload.templateId,
      params: templateArguments
    })
    route = 'template/msg'
    MessageObject = MessageObject + `&template=${template}`
    if (componentType !== 'text') {
      let type = body.payload.templateType.toLowerCase()
      let message = {type}
      message[type] = {
        link: body.payload.fileurl.url || body.payload.fileurl
      }
      if (componentType === 'file') {
        message[type].filename = body.payload.fileName
      }
      MessageObject = MessageObject + `&message=${JSON.stringify(message)}`
    }
  } else if (componentType === 'text') {
    MessageObject = MessageObject + `&message.type=text&message.text=${body.payload.text}`
  } else {
    let message
    let url = body.payload.fileurl.url || body.payload.fileurl
    if (componentType === 'sticker') {
      message = JSON.stringify({
        type: 'sticker',
        url: url.split('?')[0]
      })
    } else if (componentType === 'image') {
      message = JSON.stringify({
        type: 'image',
        originalUrl: url,
        previewUrl: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'video' || componentType === 'gif') {
      message = JSON.stringify({
        type: 'video',
        url: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'file') {
      message = JSON.stringify({
        type: 'file',
        url: url,
        filename: body.payload.fileName
      })
    } else if (componentType === 'audio') {
      message = JSON.stringify({
        type: 'audio',
        url: url
      })
    }
    MessageObject = MessageObject + `&message=${message}`
  }
  return {MessageObject, route}
}
exports.prepareTemplates = (gupshupTemplates) => {
  let templates = []
  for (let i = 0; i < gupshupTemplates.length; i++) {
    if (
      (gupshupTemplates[i].status === 'APPROVED' || gupshupTemplates[i].status === 'SANDBOX_REQUESTED') &&
      gupshupTemplates[i].templateType !== 'LOCATION'
    ) {
      let template = {}
      template.code = gupshupTemplates[i].languageCode
      template.type = gupshupTemplates[i].templateType
      template.vertical = gupshupTemplates[i].vertical
      template.id = gupshupTemplates[i].id
      template.name = gupshupTemplates[i].elementName
      template.text = gupshupTemplates[i].data
      let argumentsRegex = /{{[0-9]}}/g
      let templateArguments = template.text.match(argumentsRegex) ? template.text.match(argumentsRegex).join(',') : ''
      template.templateArguments = templateArguments
      let regex = template.text.replace('.', '\\.')
      regex = regex.replace(argumentsRegex, '(.*)')
      template.regex = `^${regex}$`
      template.buttons = getTemplateButtons(template)
      templates.push(template)
    }
  }
  return templates
}

function getTemplateButtons (template) {
  let templateButtons = []
  if (template.vertical.includes('BUTTON')) {
    let buttons = template.text.split('|')
    for (let i = 1; i < buttons.length; i++) {
      let buttonText = buttons[i].replace('[', '').replace(']', '')
      templateButtons.push({title: buttonText.split(',')[0]})
    }
  }
  return templateButtons
}

exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments ? body.payload.templateArguments.split(',') : []
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = number.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  let message = JSON.stringify({
    id: body.payload.templateId,
    params: templateArguments
  })
  MessageObject = MessageObject + `&template=${message}`
  if (body.payload.componentType !== 'text') {
    let type = body.payload.templateType.toLowerCase()
    let message = {type}
    message[type] = {
      link: body.payload.fileurl.url || body.payload.fileurl
    }
    if (body.payload.componentType === 'file') {
      message[type].filename = body.payload.fileName
    }
    MessageObject = MessageObject + `&message=${JSON.stringify(message)}`
  }
  return MessageObject
}
exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    let from = company.whatsApp.businessNumber.replace(/\D/g, '')
    let to = contact.number.replace(/\D/g, '')
    let appName = company.whatsApp.appName
    let componentType = payload.componentType
    let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
    if (componentType === 'text') {
      payload.text = payload.text + appendOptions(options)
      MessageObject = MessageObject + `&message.type=text&message.text=${payload.text}`
    } else if (componentType === 'card') {
      MessageObject = MessageObject + `&message.type=text&message.text=${payload.url}`
    } else {
      let message
      let url = payload.fileurl && payload.fileurl.url
      if (componentType === 'image' || payload.mediaType === 'image') {
        message = JSON.stringify({
          type: 'image',
          originalUrl: url,
          previewUrl: url,
          caption: payload.caption
        })
      } else if (componentType === 'file') {
        message = JSON.stringify({
          type: 'file',
          url: url,
          filename: payload.caption
        })
      } else if (componentType === 'audio') {
        message = JSON.stringify({
          type: 'audio',
          url: url
        })
      } else if (componentType === 'video' || payload.mediaType === 'video') {
        message = JSON.stringify({
          type: 'video',
          url: url,
          caption: payload.caption
        })
      }
      MessageObject = MessageObject + `&message=${message}`
    }
    resolve(MessageObject)
  })
}
