var path = require('path')
const { appendOptions } = require('../logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const { containsURL } = require('../../api/global/utility')

exports.prepareSendMessagePayload = (body, namespace) => {
  let MessageObject = {
    to: body.recipientNumber.replace(/\D/g, ''),
    recipient_type: 'individual'
  }
  if (body.payload.componentType === 'text') {
    if (body.payload.templateName) {
      let templateArguments = body.payload.templateArguments.split(',')
      MessageObject.type = 'template'
      MessageObject['template'] = {
        namespace: namespace,
        name: body.payload.templateName,
        language: {
          policy: 'deterministic',
          code: body.payload.templateCode
        },
        components: [
          {
            type: 'body',
            parameters: templateArguments.map(t => {
              return {
                type: 'text',
                text: t
              }
            })
          }
        ]
      }
    } else {
      if (containsURL(body.payload.text)) {
        MessageObject.preview_url = true
      }
      MessageObject.type = 'text'
      MessageObject['text'] = {
        body: body.payload.text
      }
    }
  } else if (body.payload.componentType === 'sticker' ||
    body.payload.componentType === 'image' ||
    body.payload.componentType === 'thumbsUp') {
    MessageObject.type = 'image'
    MessageObject['image'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.caption
    }
  } else if (body.payload.componentType === 'video' || body.payload.componentType === 'gif') {
    MessageObject.type = 'video'
    MessageObject['video'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.caption
    }
  } else if (body.payload.componentType === 'file') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.type = 'document'
    MessageObject['document'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.fileName
    }
  } else if (body.payload.componentType === 'audio') {
    MessageObject.type = 'audio'
    MessageObject['audio'] = {
      link: body.payload.fileurl.url || body.payload.fileurl
    }
  }
  return MessageObject
}
exports.prepareTemplates = (cequensTemplates) => {
  let templates = []
  for (let i = 0; i < cequensTemplates.length; i++) {
    if (cequensTemplates[i].status === 'APPROVED') {
      let template = {}
      template.name = cequensTemplates[i].name
      let templateComponents = cequensTemplates[i].components
      template.code = cequensTemplates[i].language
      template.type = 'TEXT'
      template.id = cequensTemplates[i].id
      for (let j = 0; j < templateComponents.length; j++) {
        if (templateComponents[j].type === 'BODY') {
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
exports.prepareInvitationPayload = (body, number, namespace) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let MessageObject = {
    to: number.replace(/\D/g, ''),
    recipient_type: 'individual',
    type: 'template',
    template: {
      namespace: namespace,
      name: body.payload.templateName,
      language: {
        policy: 'deterministic',
        code: body.payload.templateCode
      },
      components: [
        {
          type: 'body',
          parameters: templateArguments.map(t => {
            return {
              type: 'text',
              text: t
            }
          })
        }
      ]
    }
  }
  return MessageObject
}
exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    let MessageObject = {
      to: contact.number.replace(/\D/g, ''),
      recipient_type: 'individual'
    }
    if (payload.componentType === 'text') {
      if (containsURL(payload.text)) {
        MessageObject.preview_url = true
      }
      MessageObject.type = 'text'
      MessageObject['text'] = {
        body: payload.text + appendOptions(options)
      }
    } else if (payload.componentType === 'image' || payload.mediaType === 'image') {
      MessageObject.type = 'image'
      MessageObject['image'] = {
        link: payload.fileurl.url,
        caption: (payload.caption) ? payload.caption : undefined
      }
    } else if (payload.componentType === 'file') {
      MessageObject.type = 'document'
      MessageObject['document'] = {
        link: payload.fileurl.url,
        caption: (payload.caption) ? payload.caption : undefined
      }
    } else if (payload.componentType === 'audio') {
      MessageObject.type = 'audio'
      MessageObject['audio'] = {
        link: payload.fileurl.url
      }
    } else if (payload.componentType === 'video' || payload.mediaType === 'video') {
      MessageObject.type = 'video'
      MessageObject['video'] = {
        link: payload.fileurl.url,
        caption: (payload.caption) ? payload.caption : undefined
      }
    } else if (payload.componentType === 'card') {
      MessageObject.type = 'text'
      if (containsURL(payload.url)) {
        MessageObject.preview_url = true
      }
      MessageObject['text'] = {
        body: payload.url
      }
    }
    resolve(MessageObject)
  })
}

exports.prepareReceivedMessageData = (event, company) => {
  let message = event.messages[0]
  let companyWhatsApp = company.whatsApp
  let payload = {}
  return new Promise((resolve, reject) => {
    if (message.type === 'image' || message.type === 'video' || message.type === 'document' || message.type === 'audio' || message.type === 'voice') {
      cequensApiCaller(`media/` + message[message.type].id, 'get', companyWhatsApp.accessToken)
        .then(response => {
          if (response.body.errors) {
            reject(response.body.errors)
          } else {
            if (message.type === 'image' && message.image) {
              payload = { componentType: 'image', fileurl: { url: response.body.url } }
              if (message.image.caption && message.image.caption !== '') {
                payload.caption = message.image.caption
              }
              resolve(payload)
            } else if (message.type === 'video' && message.video) {
              payload = { componentType: 'video', fileurl: { url: response.body.url } }
              if (message.video.caption !== '') {
                payload.caption = message.video.caption
              }
              resolve(payload)
            } else if (message.type === 'document') {
              payload = {
                componentType: 'file',
                fileurl: { url: response.body.url },
                fileName: message.document.filename
              }
              resolve(payload)
            } else if (message.type === 'audio') {
              payload = { componentType: 'audio', fileurl: { url: response.body.url } }
              resolve(payload)
            } else if (message.type === 'voice') {
              payload = { componentType: 'audio', fileurl: { url: response.body.url } }
              resolve(payload)
            }
          }
        })
        .catch(error => {
          reject(error)
        })
    } else if (message.type === 'location') {
      payload = {
        componentType: 'location',
        title: 'Pinned Location',
        payload: {
          coordinates: { lat: message.location.latitude, long: message.location.longitude }
        }
      }
      resolve(payload)
    } else if (message.type === 'contacts' && message.contacts[0]) {
      payload = { componentType: 'contact',
        name: message.contacts[0].name.formatted_name,
        number: message.contacts[0].phones[0].phone }
      resolve(payload)
    } else if (message.type === 'text' && message.text.body !== '') {
      payload = { componentType: 'text', text: message.text.body }
      resolve(payload)
    } else {
      resolve(payload)
    }
  })
}
