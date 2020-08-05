const { openGraphScrapper } = require('../../global/utility')

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
