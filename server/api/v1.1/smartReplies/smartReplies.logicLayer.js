const logger = require('../../../components/logger')
const request = require('request')
const TAG = 'api/smart_replies/bots.controller.js'
const fs = require('fs')
const youtubedl = require('youtube-dl')
const path = require('path')
const needle = require('needle')
const util = require('util')
const BotsDataLayer = require('./bots.datalayer')
const { callApi } = require('../utility')
const dir = path.resolve(__dirname, '../../../../smart-replies-files/')

const downloadVideo = (data) => {
  return new Promise((resolve, reject) => {
    let video = youtubedl(data.url)
    let stream

    video.on('info', (info) => {
      logger.serverLog(TAG, 'Download started', 'debug')
      logger.serverLog(TAG, 'filename: ' + info.filename, 'debug')
      logger.serverLog(TAG, 'size: ' + info.size, 'debug')
      let size = info.size
      if (size < 25000000) {
        stream = video.pipe(fs.createWriteStream(`${dir}/bot-video.mp4`))
        stream.on('error', (error) => {
          stream.end()
          reject(util.inspect(error))
        })
        stream.on('finish', () => {
          resolve(`${dir}/bot-video.mp4`)
        })
      } else {
        resolve('ERR_LIMIT_REACHED')
      }
    })
  })
}

const uploadVideo = (data) => {
  return new Promise((resolve, reject) => {
    needle.get(
      `https://graph.facebook.com/v2.10/${data.pageId}?fields=access_token&access_token=${data.userAccessToken}`,
      (err, resp2) => {
        if (err) {
          logger.serverLog(TAG, `Failed to get page access_token ${JSON.stringify(err)}`, 'error')
          reject(util.inspect(err))
        }
        let pageAccessToken = resp2.body.access_token
        let fileReaderStream = fs.createReadStream(`${data.serverPath}`)
        const messageData = {
          'message': JSON.stringify({
            'attachment': {
              'type': 'video',
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
            'uri': 'https://graph.facebook.com/v2.6/me/message_attachments?access_token=' + pageAccessToken
          },
          function (err, resp) {
            if (err) {
              logger.serverLog(TAG, `Failed to upload attachment on Facebook ${JSON.stringify(err)}`, 'error')
              reject(util.inspect(err))
            } else {
              logger.serverLog(TAG, `video uploaded on Facebook ${JSON.stringify(resp.body)}`)
              resolve(resp.body.attachment_id)
            }
          })
      })
  })
}

const deleteVideo = (data) => {
  return new Promise((resolve, reject) => {
    fs.unlink(data.serverPath, (error) => {
      if (error) {
        reject(util.inspect(error))
      } else {
        resolve('Deleted successfully!')
      }
    })
  })
}

const fetchPage = (botId, authToken) => {
  return new Promise((resolve, reject) => {
    BotsDataLayer.findOneBotObject(botId)
      .then(bot => {
        callApi(`pages/${bot.pageId}`, 'get', {})
          .then(page => {
            resolve(page)
          })
          .catch(err => {
            reject(util.inspect(err))
          })
      })
      .catch(err => {
        reject(util.inspect(err))
      })
  })
}

exports.getMessageData = (data) => {
  return new Promise((resolve, reject) => {
    let messageData = {}
    if (data.attachment_id) {
      logger.serverLog(TAG, `video message`, 'debug')
      messageData = {
        'recipient': JSON.stringify({
          'id': data.senderId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'video',
            'payload': {
              'attachment_id': data.attachment_id
            }
          }
        })
      }
      resolve(messageData)
    } else if (data.videoLink) {
      logger.serverLog(TAG, `template message`, 'debug')
      messageData = {
        'recipient': JSON.stringify({
          'id': data.senderId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'open_graph',
              'elements': [
                {
                  'url': data.videoLink
                }
              ]
            }
          }
        })
      }
      resolve(messageData)
    } else {
      logger.serverLog(TAG, `text message`, 'debug')
      messageData = {
        'messaging_type': 'RESPONSE',
        'recipient': JSON.stringify({
          'id': data.senderId
        }),
        'message': JSON.stringify({
          'text': data.answer + '  (Bot)',
          'metadata': 'This is a meta data'
        })
      }
      resolve(messageData)
    }
  })
}

exports.talkToHumanPaylod = (botId, data, postbackPayload) => {
  let messageData = {
    text: 'This is an automated reply. If you wish to talk to a human agent, please click the button below:',
    quick_replies: [
      {
        'content_type': 'text',
        'title': 'Talk to Human',
        'payload': JSON.stringify(
          {bot_id: botId, option: 'talkToHuman', intentId: postbackPayload.intentId, question: postbackPayload.Question})
      }
    ]
  }
  let payload = {
    messaging_type: 'UPDATE',
    recipient: JSON.stringify({id: data.senderId}), // this is the subscriber id
    message: JSON.stringify(messageData)
    //  tag: req.body.fbMessageTag
  }
  return payload
}

exports.updatePayloadForVideo = (botId, payload, authToken) => {
  logger.serverLog(TAG, `payload receieved ${JSON.stringify(payload)}`, 'debug')
  return new Promise((resolve, reject) => {
    /* eslint-disable no-useless-escape */
    let videoRegex = new RegExp(`^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$`, 'g')
    let YouTubeRegex = new RegExp('^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+', 'g')
    /* eslint-enable no-useless-escape */
    for (let i = 0; i < payload.length; i++) {
      if (videoRegex.test(payload[i].answer)) {
        logger.serverLog(TAG, `answer is url`, 'debug')
        // Check if youtube url
        if (YouTubeRegex.test(payload[i].answer)) {
          logger.serverLog(TAG, `answer is YouTube video`, 'debug')
          let data = {
            url: payload[i].answer
          }

          let fetchedPage = fetchPage(botId, authToken)

          fetchedPage.then(result => {
            logger.serverLog(TAG, `fetchedPage result: ${JSON.stringify(result)}`, 'debug')
            data.userAccessToken = result.userId.facebookInfo.fbToken
            data.pageId = result.pageId
            return downloadVideo(data)
          })
            .then(path => {
              logger.serverLog(TAG, `downloadVideo response ${util.inspect(path)}`, 'debug')
              if (path === 'ERR_LIMIT_REACHED') {
                payload[i].videoLink = payload[i].answer
                return path
              } else {
                data.serverPath = path
                return uploadVideo(data)
              }
            })
            .then(attachmentId => {
              if (data.serverPath) {
                data.attachment_id = attachmentId
                payload[i].attachment_id = attachmentId
                return deleteVideo(data)
              } else {
                return attachmentId
              }
            })
            .then(result => {
              logger.serverLog(TAG, result, 'debug')
              if (i === (payload.length - 1)) {
                logger.serverLog(TAG, `returning updated payload ${JSON.stringify(payload)}`)
                resolve(payload)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `${util.inspect(err)}`)
              reject(util.inspect(err))
            })
        } else {
          payload[i].videoLink = payload[i].answer
          if (i === (payload.length - 1)) {
            logger.serverLog(TAG, `returning updated payload ${JSON.stringify(payload)}`, 'debug')
            resolve(payload)
          }
        }
      } else {
        if (i === (payload.length - 1)) {
          logger.serverLog(TAG, `returning updated payload ${JSON.stringify(payload)}`, 'debug')
          resolve(payload)
        }
      }
    }
  })
}

const prepareSubscribersPayload = (subscribers) => {
  let subsArray = []
  let subscribersPayload = []
  for (let i = 0; i < subscribers.length; i++) {
    subsArray.push(subscribers[i]._id)
    subscribersPayload.push({
      _id: subscribers[i]._id,
      firstName: subscribers[i].firstName,
      lastName: subscribers[i].lastName,
      locale: subscribers[i].locale,
      gender: subscribers[i].gender,
      timezone: subscribers[i].timezone,
      profilePic: subscribers[i].profilePic,
      companyId: subscribers[i].companyId,
      pageScopedId: '',
      email: '',
      senderId: subscribers[i].senderId,
      pageId: subscribers[i].pageId,
      datetime: subscribers[i].datetime,
      isEnabledByPage: subscribers[i].isEnabledByPage,
      isSubscribed: subscribers[i].isSubscribed,
      phoneNumber: subscribers[i].phoneNumber,
      unSubscribedBy: subscribers[i].unSubscribedBy,
      tags: [],
      source: subscribers[i].source
    })
  }
  return {ids: subsArray, payload: subscribersPayload}
}

const createBotPayload = (req, companyUser, witres, uniquebotName) => {
  var bot = {
    pageId: req.body.pageId, // TODO ENUMS
    userId: req.user._id,
    botName: req.body.botName,
    companyId: companyUser.companyId,
    witAppId: witres.body.app_id,
    witToken: witres.body.access_token,
    witAppName: uniquebotName,
    isActive: req.body.isActive,
    hitCount: 0,
    missCount: 0
  }
  return bot
}
const getEntities = (payload) => {
  var transformed = []
  for (var i = 0; i < payload.length; i++) {
    transformed.push(payload[i].intent_name)
  }
  logger.serverLog(`Entities extracted ${JSON.stringify(transformed)}`, 'debug')
  return transformed
}
const trainingPipline = (entities, payload, token) => {
  for (let i = 0; i < entities.length; i++) {
    request(
      {
        'method': 'DELETE',
        'uri': 'https://api.wit.ai/entities/intent/values/' + entities[i] + '?v=20170307',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      },
      (err, witres) => {
        if (err) {
          return logger.serverLog(
            'Error Occured In Training Pipeline in WIT.AI app', 'error')
        }
        logger.serverLog(`Response from Training Pipeline ${JSON.stringify(witres)}`)
        if (i === entities.length - 1) {
          trainBot(payload, token)
        }
      })
  }
}
function trainBot (payload, token) {
  var transformed = transformPayload(payload)
  logger.serverLog(`Payload Transformed ${JSON.stringify(transformed)}`, 'debug')
  request(
    {
      'method': 'POST',
      'uri': 'https://api.wit.ai/samples?v=20170307',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: transformed,
      json: true
    },
    (err, witres) => {
      if (err) {
        return logger.serverLog('Error Occured In Training WIT.AI app', 'error')
      }
      logger.serverLog(`WitAI bot trained successfully ${JSON.stringify(witres)}`)
    })
}
function transformPayload (payload) {
  var transformed = []
  for (var i = 0; i < payload.length; i++) {
    for (var j = 0; j < payload[i].questions.length; j++) {
      var sample = {}
      sample.text = payload[i].questions[j]
      sample.entities = [{
        entity: 'intent',
        value: payload[i].intent_name
      }]
      transformed.push(sample)
    }
  }
  return transformed
}
exports.getEntities = getEntities
exports.prepareSubscribersPayload = prepareSubscribersPayload
exports.createBotPayload = createBotPayload
exports.trainingPipline = trainingPipline
