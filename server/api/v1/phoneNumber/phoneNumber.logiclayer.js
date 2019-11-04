const path = require('path')
const crypto = require('crypto')
let _ = require('lodash')

exports.directory = function (req) {
  var today = new Date()
  var uid = crypto.randomBytes(5).toString('hex')
  var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
  serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
  let fext = req.files.file.name.split('.')
  serverPath += '.' + fext[fext.length - 1]
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
  return {
    serverPath: serverPath, dir: dir
  }
}

exports.getFiles = function (phone, req, newFileName) {
  let filename = []
  for (let i = 0; i < phone.fileName.length; i++) {
    filename.push(phone.fileName[i])
  }
  if (exists(filename, req.files.file.name) === false) {
    filename.push(newFileName)
  }
  return filename
}

exports.subscriberFindCriteria = function (number, company) {
  let findNumber = []
  let findPage = []
  for (let a = 0; a < number.length; a++) {
    findNumber.push(number[a].number)
    findPage.push(number[a].pageId)
  }
  let subscriberFindCriteria = {source: 'customer_matching', companyId: company.companyId._id, isSubscribed: true, completeInfo: true}
  subscriberFindCriteria = _.merge(subscriberFindCriteria, {
    phoneNumber: {
      $in: findNumber
    },
    pageId: {
      $in: findPage
    }
  })
  return subscriberFindCriteria
}

exports.getContent = function (subscribers) {
  let temp = []
  for (let i = 0; i < subscribers.length; i++) {
    temp.push(subscribers[i]._id)
  }
  return temp
}

exports.getFilesManual = function (phone) {
  let filename = []
  for (let i = 0; i < phone.fileName.length; i++) {
    filename.push(phone.fileName[i])
  }
  if (exists(filename, 'Other') === false) {
    filename.push('Other')
  }
  return filename
}

function exists (filename, phonefile) {
  for (let i = 0; i < filename.length; i++) {
    if (filename[i] === phonefile) {
      return true
    }
  }
  return false
}
