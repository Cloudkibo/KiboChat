const { openGraphScrapper } = require('../../global/utility')

exports.prepareChat = (from, to, contact, body, format) => {
  return new Promise((resolve, reject) => {
    let MessageObject = {
      senderNumber: from,
      recipientNumber: to,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: body,
      status: 'unseen',
      format
    }
    console.log('MessageObject', JSON.stringify(MessageObject))
    getMetaData(MessageObject)
      .then(result => {
        resolve(MessageObject)
      })
      .catch(err => {
        console.log('prepareChat err', err)
        reject(err)
      })
  })
}

function getmetaurl (text) {
  console.log('getmetaurl', text)
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
  console.log('getMetaData body', JSON.stringify(body))
  return new Promise((resolve, reject) => {
    console.log('getMetaData body inside promise', JSON.stringify(body))
    if (body.payload.componentType === 'text') {
      let isUrl = getmetaurl(body.payload.text)
      console.log('isUrl', isUrl)
      if (isUrl) {
        openGraphScrapper(isUrl)
          .then(meta => {
            body.url_meta = meta
            resolve(body)
          })
          .catch((err) => {
            reject(err)
          })
      } else {
        resolve(body)
      }
    } else {
      resolve(body)
    }
  })
}
