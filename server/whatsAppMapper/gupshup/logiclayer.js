
var path = require('path')
var mime = require('mime-types')
const fs = require('fs')
let config = require('../../config/environment')
const crypto = require('crypto')
const needle = require('needle')

exports.prepareSendMessagePayload = (body) => {
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = body.recipientNumber.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let componentType = body.payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (componentType === 'text') {
    if (body.payload.templateName) {
      MessageObject.template_name = body.payload.templateName
      MessageObject.template_argument = body.payload.templateArguments
      MessageObject.language = 'en'
    } else {
      MessageObject = MessageObject + `&message.type=text&message.text=${body.payload.text}`
    }
  } else {
    let message
    if (componentType === 'sticker') {
      let url = body.payload.fileurl.url || body.payload.fileurl
      message = JSON.stringify({
        type: 'sticker',
        url: url.split('?')[0]
      })
    } else if (componentType === 'image') {
      let url = body.payload.fileurl.url || body.payload.fileurl
      message = JSON.stringify({
        type: 'image',
        originalUrl: url,
        previewUrl: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'video' || componentType === 'gif') {
      message = JSON.stringify({
        type: 'video',
        url: body.payload.fileurl.url || body.payload.fileurl,
        caption: body.payload.caption
      })
    } else if (componentType === 'file') {
      message = JSON.stringify({
        type: 'file',
        url: body.payload.fileurl.url || body.payload.fileurl,
        filename: body.payload.fileName
      })
    } else if (componentType === 'audio') {
      message = JSON.stringify({
        type: 'audio',
        url: body.payload.fileurl.url || body.payload.fileurl
      })
    }
    MessageObject = MessageObject + `&message=${message}`
  }
  return MessageObject
}

exports.prepareReceivedMessageData = (body) => {
  let payload = {}
  return new Promise((resolve, reject) => {
    var media = ['image', 'video', 'audio', 'voice', 'file', 'sticker']
    var isMedia = media.includes(body.type)
    if (isMedia) {
      let ext = mime.extension(body.payload.contentType)
      uploadMedia(body.payload.url, body.payload.id + '.' + ext)
        .then(payload => {
          if (body.type === 'image') {
            payload = { componentType: 'image', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'video') {
            payload = { componentType: 'video', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'audio') {
            payload = { componentType: 'audio', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'voice') {
            payload = { componentType: 'audio', fileurl: { url: payload.url } }
          } else if (body.type === 'file') {
            payload = { componentType: 'file', fileurl: { url: payload.url } }
            resolve(payload)
          } else if (body.type === 'sticker') {
            payload = { componentType: 'sticker', fileurl: { url: payload.url } }
            resolve(payload)
          }
        })
        .catch(err => {
          reject(err)
        })
    } else if (body.type === 'location') {
      payload = {
        componentType: 'location',
        title: 'Pinned Location',
        payload: {
          coordinates: { lat: body.payload.latitude, long: body.payload.longitude }
        }
      }
      resolve(payload)
    } else if (body.type === 'contact' && body.payload.contacts[0]) {
      payload = { componentType: 'contact',
        name: body.payload.contacts[0].name.formatted_name,
        number: body.payload.contacts[0].phones[0].phone }
      resolve(payload)
    } else if (body.type === 'text' && body.payload.text !== '') {
      payload = { componentType: 'text', text: body.payload.text }
      resolve(payload)
    } else {
      resolve(payload)
    }
  })
}

const uploadMedia = function (filePath, fileName) {
  return new Promise((resolve, reject) => {
    var today = new Date()
    var uid = crypto.randomBytes(5).toString('hex')
    var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
    serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
    let fext = fileName.split('.')
    serverPath += '.' + fext[fext.length - 1].toLowerCase()
    let dir = path.resolve(__dirname, '../../../broadcastFiles/')
    needle.get(filePath, (err, res) => {
      if (err) {
        reject(new Error(err))
      } else {
        if (res.body) {
          let blob = res.body
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
      }
    })
  })
}
