const logger = require('../../../components/logger')
const TAG = 'api/v1/broadcast/broadcasts.controller.js'
const needle = require('needle')
const path = require('path')
const fs = require('fs')
let config = require('./../../../config/environment')
let request = require('request')
const crypto = require('crypto')
const utility = require('../utility')
const ogs = require('open-graph-scraper')

exports.urlMetaData = (req, res) => {
  let url = req.body.url
  if (url) {
    let options = {url}
    ogs(options, (error, results) => {
      if (!error) {
        return res.status(200).json({
          status: 'success',
          payload: results.data
        })
      } else {
        return res.status(500).json({
          status: 'failed',
          description: `Failed to retrieve url ${results.error}`
        })
      }
    })
  } else {
    res.status(400).json({
      status: 'failed',
      description: 'url not given in paramater'
    })
  }
}

exports.delete = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
  // unlink file
  fs.unlink(dir + '/' + req.params.id, function (err) {
    if (err) {
      logger.serverLog(TAG, err)
      return res.status(404)
        .json({status: 'failed', description: 'File not found'})
    } else {
      return res.status(200)
        .json({status: 'success', payload: 'File deleted successfully'})
    }
  })
}
exports.addButton = function (req, res) {
  utility.callApi(`broadcasts/addButton`, 'post', req.body, 'kiboengage', req.headers.authorization)
    .then(buttonPayload => {
      res.status(200).json({status: 'success', payload: buttonPayload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.sendConversation = function (req, res) {
  utility.callApi(`broadcasts/sendConversation`, 'post', req.body, 'kiboengage', req.headers.authorization)
    .then(result => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch(err => {
      console.log(err)
      return res.status(500).json({status: 'failed', description: `Failed to send conversation ${err}`})
    })
}
exports.editButton = function (req, res) {
  utility.callApi(`broadcasts/editButton`, 'post', req.body, 'kiboengage', req.headers.authorization)
    .then(buttonPayload => {
      res.status(200).json({status: 'success', payload: buttonPayload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.deleteButton = function (req, res) {
  utility.callApi(`broadcasts/deleteButton/${req.params.id}`, 'delete', 'kiboengage', req.headers.authorization)
    .then(buttonPayload => {
      res.status(200).json({status: 'success', payload: buttonPayload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.uploadRecording = function (req, res) {
  const today = new Date()
  const uid = crypto.randomBytes(5).toString('hex')
  const fext = req.files.file.name.split('.')
  const serverPath = `f${uid}${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}${today.getHours()}${today.getMinutes()}${today.getSeconds()}.${fext[fext.length - 1].toLowerCase()}`
  const dir = path.resolve(__dirname, '../../../../broadcastFiles/')

  if (req.files.file.size === 0) {
    return res.status(400).json({
      status: 'failed',
      description: 'No file submitted'
    })
  }

  fs.rename(req.files.file.path, `${dir}/userfiles/${serverPath}`, (err) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: 'internal server error' + JSON.stringify(err)
      })
    } else {
      logger.serverLog(TAG, `file uploaded on KiboPush: ${JSON.stringify({
        id: serverPath,
        url: `${config.domain}/api/broadcasts/download/${serverPath}`
      })}`)

      return res.status(201).json({
        status: 'success',
        payload: {
          id: serverPath,
          name: req.files.file.name,
          url: `${config.domain}/api/broadcasts/download/${serverPath}`
        }
      })
    }
  })
}
exports.upload = function (req, res) {
  var today = new Date()
  var uid = crypto.randomBytes(5).toString('hex')
  var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
  serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
  let fext = req.files.file.name.split('.')
  serverPath += '.' + fext[fext.length - 1].toLowerCase()

  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')

  if (req.files.file.size === 0) {
    return res.status(400).json({
      status: 'failed',
      description: 'No file submitted'
    })
  }
  logger.serverLog(TAG,
    `req.files.file ${JSON.stringify(req.files.file.path)}`)
  logger.serverLog(TAG,
    `req.files.file ${JSON.stringify(req.files.file.name)}`)
  logger.serverLog(TAG,
    `dir ${JSON.stringify(dir)}`)
  logger.serverLog(TAG,
    `serverPath ${JSON.stringify(serverPath)}`)
  fs.rename(
    req.files.file.path,
    dir + '/userfiles/' + serverPath,
    err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: 'internal server error' + JSON.stringify(err)
        })
      }
      console.log('req.files.file', req.files.file)
      if (req.files.file.fieldName === 'file') {
        let readData = fs.createReadStream(dir + '/userfiles/' + serverPath)
        let writeData = fs.createWriteStream(dir + '/userfiles/' + req.files.file.name)
        readData.pipe(writeData)
      }
      logger.serverLog(TAG,
        `file uploaded on KiboPush, uploading it on Facebook: ${JSON.stringify({
          id: serverPath,
          url: `${config.domain}/api/broadcasts/download/${serverPath}`
        })}`)
      if (req.body.pages && req.body.pages !== 'undefined' && req.body.pages.length > 0) {
        let pages = JSON.parse(req.body.pages)
        logger.serverLog(TAG, `Pages in upload file ${pages}`)
        utility.callApi(`pages/${pages[0]}`, 'get', {})
          .then(page => {
            needle.get(
              `https://graph.facebook.com/v6.0/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
              (err, resp2) => {
                if (err) {
                  return res.status(500).json({
                    status: 'failed',
                    description: 'unable to get page access_token: ' + JSON.stringify(err)
                  })
                }
                let pageAccessToken = resp2.body.access_token
                let fileReaderStream = fs.createReadStream(dir + '/userfiles/' + req.files.file.name)
                const messageData = {
                  'message': JSON.stringify({
                    'attachment': {
                      'type': req.body.componentType,
                      'payload': {
                        'is_reusable': true
                      }
                    }
                  }),
                  'filedata': fileReaderStream
                }
                request(
                  {
                    'method': 'POST',
                    'json': true,
                    'formData': messageData,
                    'uri': 'https://graph.facebook.com/v6.0/me/message_attachments?access_token=' + pageAccessToken
                  },
                  function (err, resp) {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: 'unable to upload attachment on Facebook, sending response' + JSON.stringify(err)
                      })
                    } else {
                      logger.serverLog(TAG,
                        `file uploaded on Facebook ${JSON.stringify(resp.body)}`)
                      return res.status(201).json({
                        status: 'success',
                        payload: {
                          id: serverPath,
                          attachment_id: resp.body.attachment_id,
                          name: req.files.file.name,
                          url: `${config.domain}/api/broadcasts/download/${serverPath}`
                        }
                      })
                    }
                  })
              })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(error)}`})
          })
      } else {
        return res.status(201).json({
          status: 'success',
          payload: {
            id: serverPath,
            name: req.files.file.name,
            url: `${config.domain}/api/broadcasts/download/${serverPath}`
          }
        })
      }
    }
  )
}

exports.download = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
  try {
    res.sendfile(req.params.id, {root: dir})
  } catch (err) {
    logger.serverLog(TAG,
      `Inside Download file, err = ${JSON.stringify(err)}`)
    res.status(404)
      .json({status: 'success', payload: 'Not Found ' + JSON.stringify(err)})
  }
}
