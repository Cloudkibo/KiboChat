const og = require('open-graph')

exports.getPayload = (body) => {
  let payload = []
  if (body.NumMedia === '0' && body.Body !== '') { // text only
    payload.push({componentType: 'text', text: body.Body})
  } else if (body.NumMedia !== '0' && body.Body !== '' && body.MediaContentType0.includes('image')) { // text with media
    payload.push({componentType: 'text', text: body.Body})
    payload.push({componentType: 'image', fileurl: {url: body.MediaUrl0}})
  } else if (body.NumMedia !== '0' && body.Body !== '' && body.MediaContentType0.includes('video')) { // text with media
    payload.push({componentType: 'text', text: body.Body})
    payload.push({componentType: 'video', fileurl: {url: body.MediaUrl0}})
  } else if (body.NumMedia !== '0') { // media only
    if (body.MediaContentType0.includes('image')) {
      payload.push({componentType: 'image', fileurl: {url: body.MediaUrl0}})
    } else if (body.MediaContentType0.includes('pdf')) {
      payload.push({componentType: 'file', fileurl: {url: body.MediaUrl0}, fileName: body.Body})
    } else if (body.MediaContentType0.includes('audio')) {
      payload.push({componentType: 'audio', fileurl: {url: body.MediaUrl0}})
    } else if (body.MediaContentType0.includes('video')) {
      payload.push({componentType: 'video', fileurl: {url: body.MediaUrl0}})
    }
  }
  return payload
}
exports.prepareChat = (from, to, contact, body) => {
  return new Promise(function (resolve, reject) {
    let MessageObject = {
      senderNumber: from,
      recipientNumber: to,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: body,
      status: 'unseen',
      format: 'twilio'
    }
    getMetaData(MessageObject).then(result => {
      resolve(MessageObject)
    })
  })
}
function getmetaurl (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  var onlyUrl = ''
  if (text) {
    var testUrl = text.match(urlRegex)
    onlyUrl = testUrl && testUrl[0]
  }
  return onlyUrl
}
function getMetaData (body) {
  return new Promise(function (resolve, reject) {
    if (body.payload.componentType === 'text') {
      let isUrl = getmetaurl(body.payload.text)
      if (isUrl !== null && isUrl !== '') {
        og(isUrl, (err, meta) => {
          if (err) {
            resolve(body)
          } else {
            body.url_meta = meta
            resolve(body)
          }
        })
      } else {
        resolve(body)
      }
    } else {
      resolve(body)
    }
  })
}

exports.preparePayload = function (data) {
  let payload = {
    name: data.name,
    number: data.number,
    companyId: data.companyId,
    isSubscribed: true
  }
  if (data.listId !== 'master') {
    payload.listIds = [data.listId]
  }
  return payload
}
