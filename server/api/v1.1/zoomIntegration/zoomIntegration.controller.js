const logger = require('../../../components/logger')
const TAG = '/api/v1/zoomIntegration/zoomIntegration.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { zoomApiCaller, refreshAccessToken } = require('../../global/zoom')
const logicLayer = require('./logicLayer')

exports.getZoomUser = function (req, res) {
  callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {companyId: req.user.companyId, connected: true}})
    .then(zoomUser => {
      if (zoomUser) {
        sendSuccessResponse(res, 200, zoomUser)
      } else {
        sendSuccessResponse(res, 200, null, 'zoom_not_integrated')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, undefined, 'Failed to get zoom integration')
    })
}

exports.createMeeting = function (req, res) {
  const data = {
    ...req.body,
    companyId: req.user.companyId,
    userId: req.user._id,
    authorization: req.headers.authorization
  }
  callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {companyId: data.companyId, connected: true}})
    .then(zoomUser => {
      if (!zoomUser) {
        sendErrorResponse(res, 500, undefined, 'Fatal error: zoom not integrated.')
      } else {
        refreshAccessToken(zoomUser)
          .then(accessToken => {
            const meetingBody = {
              topic: data.topic,
              type: 1,
              password: _generatePassword(),
              agenda: data.agenda
            }
            zoomApiCaller('post', 'v2/users/me/meetings', meetingBody, {type: 'bearer', token: accessToken}, false)
              .then(meetingResponse => {
                console.log(JSON.stringify(meetingResponse))
                const zoomMeetingPayload = logicLayer.prepareZoomMeetingPayload(data, meetingResponse)
                callApi('zoomMeetings', 'post', zoomMeetingPayload)
                  .then(meetingCreated => {
                    sendSuccessResponse(res, 200, {joinUrl: meetingResponse.join_url})
                  })
                  .catch(err => {
                    logger.serverLog(TAG, err, 'error')
                    sendErrorResponse(res, 500, undefined, 'Failed to create zoom meeting record')
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, err, 'error')
                sendErrorResponse(res, 500, undefined, 'Failed to create zoom meeting')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            sendErrorResponse(res, 500, undefined, 'Failed to refresh access token')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, undefined, 'Failed to fetch zoom user')
    })
}

const _generatePassword = () => {
  const length = 8
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let retVal = ''
  for (let i = 0; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return retVal
}
