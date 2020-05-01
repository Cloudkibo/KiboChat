const logiclayer = require('./messageBlock.logiclayer')
const datalayer = require('./messageBlock.datalayer')
const chatbotDataLayer = require('./../chatbots/chatbots.datalayer')
const needle = require('needle')
const config = require('./../../../config/environment')
const utility = require('./../../../components/utility')
const ogs = require('open-graph-scraper')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messageBlock/messageBlock.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.genericUpdateMessageBlock({uniqueId: req.body.uniqueId}, payload, {upsert: true})
    .then(messageBlock => {
      _sendToClientUsingSocket(messageBlock)
      if (req.body.triggers) {
        let updatePayload = { triggers: req.body.triggers }
        if (messageBlock.upserted) updatePayload.startingBlockId = messageBlock.upserted[0]._id
        chatbotDataLayer.genericUpdateChatBot(
          { _id: req.body.chatbotId }, updatePayload)
          .then(updated => logger.serverLog(TAG, `chatbot updated for triggers ${JSON.stringify(updated)}`))
          .catch(error => logger.serverLog(TAG, `error in chatbot update for triggers ${JSON.stringify(error)}`))
      }
      return sendSuccessResponse(res, 201, messageBlock, 'Created or updated successfully')
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error, 'Failed to create the message block.')
    })
}

exports.attachment = function (req, res) {
  if (utility.isYouTubeUrl(req.body.url)) {
    needle('post', `${config.accountsDomain}/downloadYouTubeVideo`, req.body)
      .then(data => {
        data = data.body
        if (data.payload && data.payload === 'ERR_LIMIT_REACHED') {
          let url = req.body.url
          let options = {url}
          ogs(options, (error, results) => {
            if (error) {
              return sendErrorResponse(res, 500, error, 'Failed to fetch youtube video url meta data.')
            }
            return sendSuccessResponse(res, 200, results.data, 'Fetched youtube video')
          })
        } else {
          let payload = data.payload.fileurl
          payload.pages = [req.body.pageId]
          payload.deleteLater = true
          payload.componentType = 'video'
          needle('post', `${config.accountsDomain}/uploadTemplate`, payload)
            .then(dataFinal => {
              return sendSuccessResponse(res, 200, dataFinal.body.payload, 'Fetched youtube video')
            })
            .catch(error => {
              return sendErrorResponse(res, 500, error.body, 'Failed to upload youtube video to facebook. Check with admin.')
            })
        }
      })
      .catch(error => {
        return sendErrorResponse(res, 500, error.body, 'Failed to work on the attachment. Please contact admin.')
      })
  } else if (utility.isFacebookVideoUrl(req.body.url)) {
    let fbPayload = {
      'message': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'media',
            'elements': [
              {
                'media_type': 'video',
                'url': req.body.url
              }
            ]
          }
        }
      }
    }
    return sendSuccessResponse(res, 200, {fbPayload, ...req.body}, 'Facebook video found.')
  } else {
    let url = req.body.url
    let options = {url}
    ogs(options, (error, results) => {
      if (error) {
        return sendErrorResponse(res, 500, error, 'Error in fetching meta data of website. Please check if open graph is supported.')
      }
      return sendSuccessResponse(res, 200, results.data, 'Url meta data fetched.')
    })
  }
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
  datalayer.deleteForMessageBlock({ _id: req.params.id })
    .then(messageBlock => {
      return res.status(201).json({ status: 'success', payload: messageBlock })
    })
    .catch(error => {
      return res.status(500).json({ status: 'failed', payload: `Failed to delete messageBlock ${error}` })
    })
}
