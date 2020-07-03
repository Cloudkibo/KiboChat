const {openGraphScrapper} = require('../../global/utility')

exports.getPayload = (body) => {
  let payload = {}
  if (body.media_type === 'image') {
    payload = {componentType: 'image', fileurl: {url: `https://flocksend.com${body.media_link}`}}
    if (body.message !== '' && body.message !== 'image') {
      payload.caption = body.message
    }
  } else if (body.media_type === 'video') {
    payload = {componentType: 'video', fileurl: {url: `https://flocksend.com${body.media_link}`}}
    if (body.message !== '' && body.message !== 'video') {
      payload.caption = body.message
    }
  } else if (body.media_type === 'document') {
    payload = {
      componentType: 'file',
      fileurl: {url: `https://flocksend.com${body.media_link}`},
      fileName: body.message}
  } else if (body.media_type === 'audio') {
    payload = {componentType: 'audio', fileurl: {url: `https://flocksend.com${body.media_link}`}}
  } else if (body.media_type === 'text' && body.message !== '') {
    payload = {componentType: 'text', text: body.message}
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
      format: 'whatsApp'
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
        openGraphScrapper(isUrl)
          .then(meta => {
            body.url_meta = meta
            resolve(body)
          })
          .catch(() => {
            resolve(body)
          })
      } else {
        resolve(body)
      }
    } else {
      resolve(body)
    }
  })
}
