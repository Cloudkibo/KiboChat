var path = require('path')
const { appendOptions } = require('../logiclayer')
const fs = require('fs')
const crypto = require('crypto')
let config = require('../../config/environment')
var mime = require('mime-types')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')

exports.prepareSendMessagePayload = (body) => {
  let MessageObject = {
    to: body.recipientNumber.replace(/\D/g, ''),
    recipient_type: 'individual',
    preview_url: true
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
      recipient_type: 'individual',
      preview_url: true
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

exports.prepareReceivedMessageData = (event, company) => {
  let message = event.messages[0]
  let companyWhatsApp = company.whatsApp
  let payload = {}
  return new Promise((resolve, reject) => {
    if (message.type === 'image' || message.type === 'video' || message.type === 'document' || message.type === 'audio' || message.type === 'voice') {
      cequensApiCaller(`media/` + message[message.type].id, companyWhatsApp.clientName, event.businessNumber.replace('+', ''), 'get', companyWhatsApp.accessToken)
        .then(response => {
          if (response.body.errors) {
            reject(response.body.errors)
          } else {
            let ext = mime.extension(response.headers['content-type'])
            uploadMedia(response.body, message[message.type].id + '.' + ext)
              .then(payload => {
                let uploadedUrl = payload.url
                if (message.type === 'image' && message.image) {
                  payload = { componentType: 'image', fileurl: { url: uploadedUrl } }
                  if (message.image.caption && message.image.caption !== '') {
                    payload.caption = message.image.caption
                  }
                  resolve(payload)
                } else if (message.type === 'video' && message.video) {
                  payload = { componentType: 'video', fileurl: { url: uploadedUrl } }
                  if (message.video.caption !== '') {
                    payload.caption = message.video.caption
                  }
                  resolve(payload)
                } else if (message.type === 'document') {
                  payload = {
                    componentType: 'file',
                    fileurl: { url: uploadedUrl },
                    fileName: message.document.filename
                  }
                  resolve(payload)
                } else if (message.type === 'audio') {
                  payload = { componentType: 'audio', fileurl: { url: uploadedUrl } }
                  resolve(payload)
                } else if (message.type === 'voice') {
                  payload = { componentType: 'audio', fileurl: { url: uploadedUrl } }
                  resolve(payload)
                }
              })
              .catch(err => {
                reject(err)
              })
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

const uploadMedia = function (blob, fileName) {
  return new Promise((resolve, reject) => {
    var today = new Date()
    var uid = crypto.randomBytes(5).toString('hex')
    var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
    serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
    let fext = fileName.split('.')
    serverPath += '.' + fext[fext.length - 1].toLowerCase()
    console.log('dir', __dirname)
    let dir = path.resolve(__dirname, '../../../broadcastFiles/')
    if (blob) {
      fs.writeFile(dir + '/userfiles/' + serverPath, blob, (err) => {
        if (err) {
          reject(err)
        } else {
          let payload = {
            id: serverPath,
            name: fileName,
            url: `${config.domain}/api/broadcasts/download/${serverPath}`
          }
          resolve(payload)
        }
      })
    } else {
      reject(new Error('Blob not found'))
    }
  })
}
