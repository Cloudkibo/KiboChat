var path = require('path')
const { appendOptions } = require('../logiclayer')

exports.prepareSendMessagePayload = (body) => {
  let MessageObject = {
    to: body.recipientNumber.replace(/\D/g, ''),
    recipient_type: 'individual'
  }
  if (body.payload.componentType === 'text') {
    if (body.payload.templateName) {
      let templateArguments = body.payload.templateArguments.split(',')
      MessageObject.type = 'template'
      MessageObject['template'] = {
        namespace: body.payload.templateNameSpace,
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
exports.prepareTemplates = () => {
  let templates = [
    {
      name: 'cequens_autoreply',
      namespace: 'c088281d_2079_43e6_820e_5389ef88806d',
      code: 'en',
      text: 'This is automated message regarding to your Ticket No. {{1}}. We have received your request and will get back to you within 1 working day',
      templateArguments: '{{1}}',
      regex: '^This is automated message regarding to your Ticket No. (.*). We have received your request and will get back to you within 1 working day$',
      buttons: []
    }
  ]
  return templates
}
exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let MessageObject = {
    to: number.replace(/\D/g, ''),
    recipient_type: 'individual',
    type: 'template',
    template: {
      namespace: body.payload.templateNameSpace,
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
      MessageObject['text'] = {
        body: payload.url
      }
    }
    resolve(MessageObject)
  })
}

exports.prepareReceivedMessageData = (event) => {
  let message = event.messages[0]
  let payload = {}
  if (message.type === 'image' && message.image) {
    payload = { componentType: 'image', fileurl: { url: message.image.file } }
    if (message.image.caption !== '') {
      payload.caption = message.image.caption
    }
  } else if (message.type === 'video' && message.video) {
    payload = { componentType: 'video', fileurl: { url: message.video.file } }
    if (message.video.caption !== '') {
      payload.caption = message.video.caption
    }
  } else if (message.type === 'document') {
    payload = {
      componentType: 'file',
      fileurl: { url: message.document.file },
      fileName: message.document.filename
    }
  } else if (message.type === 'audio') {
    payload = { componentType: 'audio', fileurl: { url: message.audio.file } }
  } else if (message.type === 'voice') {
    payload = { componentType: 'voice', fileurl: { url: message.voice.file } }
  } else if (message.type === 'location') {
    payload = {
      componentType: 'location',
      title: 'Pinned Location',
      payload: {
        coordinates: { lat: message.location.latitude, long: message.location.longitude }
      }
    }
  } else if (message.type === 'contacts' && message.contacts[0]) {
    payload = { componentType: 'contact',
      name: message.contacts[0].name.formatted_name,
      number: message.contacts[0].phones[0].phone }
  } else if (message.type === 'text' && message.text.body !== '') {
    payload = { componentType: 'text', text: message.text.body }
  }
  return payload
}
