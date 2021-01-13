const logiclayer = require('./messageBlock.logiclayer')
const datalayer = require('./messageBlock.datalayer')
const urlDataLayer = require('./url.datalayer')
const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const needle = require('needle')
const config = require('./../../../config/environment')
const utility = require('./../../../components/utility')
const ogs = require('open-graph-scraper')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messageBlock/messageBlock.controller.js'
const {openGraphScrapper} = require('../../global/utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.genericUpdateMessageBlock({ uniqueId: req.body.uniqueId }, payload, { upsert: true })
    .then(messageBlock => {
      _sendToClientUsingSocket(messageBlock)
      updateUrlForClickCount(payload)
      if (req.body.updateStartingBlockId) {
        let updatePayload = {}
        if (messageBlock.upserted) updatePayload.startingBlockId = messageBlock.upserted[0]._id
        chatbotDataLayer.genericUpdateChatBot(
          { _id: req.body.chatbotId }, updatePayload)
          .then(updated => {})
          .catch(error => {
            const message = error || 'error in chatbot update for triggers'
            logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          })
      }
      return sendSuccessResponse(res, 201, messageBlock, 'Created or updated successfully')
    })
    .catch(error => {
      const message = error || 'Failed to create the message block'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to create the message block.')
    })
}

exports.attachment = function (req, res) {
  if (utility.isYouTubeUrl(req.body.url)) {
    if (req.body.isYoutubePlayable) {
      needle('post', `${config.accountsDomain}/downloadYouTubeVideo`, req.body)
        .then(data => {
          console.log('data', data.body)
          data = data.body
          if (data.status !== 'failed') {
            if (data.payload && data.payload === 'ERR_LIMIT_REACHED') {
              fetchMetaData(req, res)
            } else {
              console.log('data.payload.fileurl', data.payload.fileurl)
              let payload = data.payload.fileurl
              payload.pages = [req.body.pageId]
              payload.componentType = 'video'
              needle('post', `${config.accountsDomain}/uploadTemplate`, payload, {open_timeout: 0})
                .then(dataFinal => {
                  if (dataFinal.body.status === 'failed') {
                    fetchMetaData(req, res)
                  } else {
                    return sendSuccessResponse(res, 200, dataFinal.body.payload, 'Fetched youtube video')
                  }
                })
                .catch(error => {
                  const message = error || 'Failed to upload youtube video to facebook.'
                  logger.serverLog(message, `${TAG}: exports.attachment`, req.body, {user: req.user}, 'error')
                  return sendErrorResponse(res, 500, error.body, 'Failed to upload youtube video to facebook. Check with admin.')
                })
            }
          } else {
            return sendErrorResponse(res, 500, data, 'Failed to work on the attachment. Please contact admin.')
          }
        })
        .catch(error => {
          const message = error || 'Failed to work on the attachment'
          if (message !== 'Unable to process video link. Please try again.') {
            logger.serverLog(message, `${TAG}: exports.attachment`, req.body, {user: req.user}, 'error')
          }
          return sendErrorResponse(res, 500, error.body, 'Failed to work on the attachment. Please contact admin.')
        })
    } else {
      fetchMetaData(req, res)
    }
  } else if (utility.isFacebookVideoUrl(req.body.url.split('?')[0])) {
    let url = req.body.url.split('?')[0]
    let options = { url }
    ogs(options, (error, results) => {
      if (error) {
        const message = error || 'Failed to fetching meta data of website'
        logger.serverLog(message, `${TAG}: exports.attachment`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, error, 'Error in fetching meta data of website. Please check if open graph is supported.')
      }
      if (results.data.ogType) {
        let finalPayload = {
          'type': 'fb_video',
          'url': req.body.url
        }
        return sendSuccessResponse(res, 200, finalPayload, 'Facebook video found.')
      } else {
        return sendErrorResponse(res, 500, {}, 'Video is private')
      }
    })
  } else {
    fetchMetaData(req, res)
  }
}

function fetchMetaData (req, res) {
  let url = req.body.url
  openGraphScrapper(url)
    .then(results => {
      return sendSuccessResponse(res, 200, results, 'Fetched youtube video')
    }).catch(err => {
      if (err !== 'Must scrape an HTML page') {
        const message = err || 'Failed to fetch url meta Deta.'
        logger.serverLog(message, `${TAG}: exports.fetchMetaData`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, err, 'Failed to fetch url meta data.')
      } else {
        return sendErrorResponse(res, 500, err, 'invalid or private url.')
      }
    })
}
function _sendToClientUsingSocket (body) {
  require('../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'chatbot_messageBlock_newCreated',
      payload: {
        chatbot: body
      }
    }
  })
}

exports.delete = function (req, res) {
  datalayer.deleteForMessageBlock({ _id: { $in: req.body.ids } })
    .then(messageBlock => {
      return res.status(201).json({ status: 'success', payload: messageBlock })
    })
    .catch(error => {
      const message = error || 'Failed to delete messageBlock'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to delete messageBlock ${error}` })
    })
}

exports.scriptChatbotBlocks = function (req, res) {
  datalayer.findAllMessageBlock({ 'module.type': 'chatbot' })
    .then(messageBlocks => {
      for (let i = 0; i < messageBlocks.length; i++) {
        updateUrlForClickCount(messageBlocks[i])
      }
      return res.status(201).json({ status: 'success', payload: messageBlocks })
    })
    .catch(error => {
      const message = error || 'Failed to find chatbot blocks'
      logger.serverLog(message, `${TAG}: exports.scriptChatbotBlocks`, {}, {user: req.user}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed script ${error}` })
    })
}

function updateUrlForClickCount (payload) {
  if (payload.payload[1] && payload.payload[1].buttons && payload.payload[1].buttons[0]) {
    urlDataLayer.genericFind({ 'module.id': payload.uniqueId })
      .then(foundUrl => {
        if (!foundUrl) {
          let urlPayload = {
            originalURL: payload.payload[1].buttons[0].url,
            module: {
              type: 'chatbot',
              id: payload.uniqueId
            }
          }
          urlDataLayer.createURLObject(urlPayload)
            .then(createdUrl => {
              payload.payload[1].buttons[0].urlForFacebook = `${config.domain}/api/chatbots/url/${createdUrl._id}`
              datalayer.genericUpdateMessageBlock({ uniqueId: payload.uniqueId }, payload, { upsert: false })
                .then(updatedMessageBlock => {
                })
                .catch(err => {
                  const message = err || 'error in updating Url'
                  return logger.serverLog(message, `${TAG}: exports.updateUrlForClickCount`, {}, {payload}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'error in fetching Url'
              logger.serverLog(message, `${TAG}: exports.updateUrlForClickCount`, {}, {payload}, 'error')
            })
        } else {
          urlDataLayer.updateOneURL(foundUrl._id, { originalURL: payload.payload[1].buttons[0].url })
            .then(updatedUrl => {
              payload.payload[1].buttons[0].urlForFacebook = `${config.domain}/api/chatbots/url/${foundUrl._id}`
              datalayer.genericUpdateMessageBlock({ uniqueId: payload.uniqueId }, payload, { upsert: false })
                .then(updatedMessageBlock => {
                })
                .catch(err => {
                  const message = err || 'error in updating Url'
                  logger.serverLog(message, `${TAG}: exports.updateUrlForClickCount`, {}, {payload}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'error in updating Url'
              logger.serverLog(message, `${TAG}: exports.updateUrlForClickCount`, {}, {payload}, 'error')
            })
        }
      })
      .catch(err => {
        const message = err || 'error in fetching Url'
        logger.serverLog(message, `${TAG}: exports.updateUrlForClickCount`, {}, {payload}, 'error')
      })
  }
}
