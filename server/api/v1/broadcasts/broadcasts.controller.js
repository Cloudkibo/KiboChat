const logger = require('../../../components/logger')
const TAG = 'api/v1/broadcast/broadcasts.controller.js'
const needle = require('needle')
const path = require('path')
const fs = require('fs')
let config = require('./../../../config/environment')
let request = require('request')
const crypto = require('crypto')
const utility = require('../utility')
const { openGraphScrapper } = require('../../global/utility')

const isHtmlPageError = (err) => {
  if (err === 'Must scrape an HTML page') {
    return true
  } else {
    return false
  }
}

exports.urlMetaData = (req, res) => {
  let url = req.body.url
  if (url.includes('kiboengage.cloudkibo.com') || url.includes('kibochat.cloudkibo.com')) {
    url = 'https://kibopush.com'
  }
  if (url) {
    openGraphScrapper(url)
      .then(meta => {
        return res.status(200).json({
          status: 'success',
          payload: meta
        })
      }).catch(err => {
        if (!isHtmlPageError(err)) {
          const message = err || 'Error from open graph'
          logger.serverLog(message, `${TAG}: urlMetaData`, req.body, {}, 'error')
        }
        return res.status(500).json({
          status: 'failed',
          description: `Failed to retrieve url ${err}`
        })
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
      const message = err || 'error in deleting file'
      logger.serverLog(message, `${TAG}: exports.delete`, {}, {params: req.params}, 'error')
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
      const message = err || 'failed to add button'
      logger.serverLog(message, `${TAG}: exports.addButton`, req.body, {}, 'error')
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.sendConversation = function (req, res) {
  utility.callApi(`broadcasts/sendConversation`, 'post', req.body, 'kiboengage', req.headers.authorization)
    .then(result => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch(err => {
      const message = err || 'failed to send conversation'
      logger.serverLog(message, `${TAG}: exports.sendConversation`, req.body, {}, 'error')
      return res.status(500).json({status: 'failed', description: `Failed to send conversation ${err}`})
    })
}
exports.editButton = function (req, res) {
  utility.callApi(`broadcasts/editButton`, 'post', req.body, 'kiboengage', req.headers.authorization)
    .then(buttonPayload => {
      res.status(200).json({status: 'success', payload: buttonPayload})
    })
    .catch(err => {
      const message = err || 'failed to edit button'
      logger.serverLog(message, `${TAG}: exports.editButton`, req.body, {}, 'error')
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.deleteButton = function (req, res) {
  utility.callApi(`broadcasts/deleteButton/${req.params.id}`, 'delete', 'kiboengage', req.headers.authorization)
    .then(buttonPayload => {
      res.status(200).json({status: 'success', payload: buttonPayload})
    })
    .catch(err => {
      const message = err || 'failed to delete button'
      logger.serverLog(message, `${TAG}: exports.deleteButton`, {}, {params: req.params}, 'error')
      res.status(500).json({status: 'failed', description: `Failed to add button ${err}`})
    })
}
exports.uploadRecording = function (req, res) {
  console.log('in uploadRecording')
  console.log('req.files', req.files)
  console.log('req.files.file', req.files.file)
  const today = new Date()
  const uid = crypto.randomBytes(5).toString('hex')
  const fext = req.files.file.name.split('.')
  const serverPath = `f${uid}${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}${today.getHours()}${today.getMinutes()}${today.getSeconds()}.${fext[fext.length - 1].toLowerCase()}`
  const dir = path.resolve(__dirname, '../../../../broadcastFiles/')
  console.log('req.files.file', req.files.file)
  if (req.files.file.size === 0) {
    return res.status(400).json({
      status: 'failed',
      description: 'No file submitted'
    })
  }

  fs.rename(req.files.file.path, `${dir}/userfiles/${serverPath}`, (err) => {
    if (err) {
      const message = err || 'error in moving file'
      logger.serverLog(message, `${TAG}: exports.uploadRecording`, {}, {files: req.files}, 'error')
      return res.status(500).json({
        status: 'failed',
        description: 'internal server error' + JSON.stringify(err)
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
  fs.rename(
    req.files.file.path,
    dir + '/userfiles/' + serverPath,
    err => {
      if (err) {
        const message = err || 'error in moving file'
        logger.serverLog(message, `${TAG}: exports.uploadRecording`, req.body, {files: req.files}, 'error')
        return res.status(500).json({
          status: 'failed',
          description: 'internal server error' + JSON.stringify(err)
        })
      }
      if (req.files.file.fieldName === 'file') {
        let readData = fs.createReadStream(dir + '/userfiles/' + serverPath)
        let writeData = fs.createWriteStream(dir + '/userfiles/' + req.files.file.name)
        readData.pipe(writeData)
      }
      if (req.body.pages && req.body.pages !== 'undefined' && req.body.pages.length > 0) {
        let pages = JSON.parse(req.body.pages)
        utility.callApi(`pages/${pages[0]}`, 'get', {})
          .then(page => {
            needle.get(
              `https://graph.facebook.com/v6.0/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
              (err, resp2) => {
                if (err) {
                  const message = err || 'unable to get page access token'
                  logger.serverLog(message, `${TAG}: exports.upload`, req.body, {files: req.files, pages}, 'error')
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
                      const message = err || 'unable to upload attachment to facebook'
                      logger.serverLog(message, `${TAG}: exports.upload`, req.body, {files: req.files, pages}, 'error')
                      return res.status(500).json({
                        status: 'failed',
                        description: 'unable to upload attachment on Facebook, sending response' + JSON.stringify(err)
                      })
                    } else {
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
            const message = error || 'unable to get page'
            logger.serverLog(message, `${TAG}: exports.upload`, req.body, {files: req.files, pages}, 'error')
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
  if (fs.existsSync(dir + '/' + req.params.id)) {
    try {
      res.sendfile(req.params.id, {root: dir})
    } catch (err) {
      const message = err || 'Inside download file error'
      logger.serverLog(message, `${TAG}: exports.download`, {}, {params: req.params}, 'error')
      res.status(404)
        .json({status: 'success', payload: 'Not Found ' + JSON.stringify(err)})
    }
  } else {
    return res.status(500).json({
      status: 'failed',
      description: 'File not found'
    })
  }
}
