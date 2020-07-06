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
              password: logicLayer.generatePassword(),
              agenda: data.agenda
            }
            const rateLimitPayload = logicLayer.checkRateLimit(zoomUser)
            if (!rateLimitPayload.limitReached) {
              zoomApiCaller('post', 'v2/users/me/meetings', meetingBody, {type: 'bearer', token: accessToken}, false)
                .then(meetingResponse => {
                  const zoomMeetingPayload = logicLayer.prepareZoomMeetingPayload(data, meetingResponse)
                  callApi('zoomMeetings', 'post', zoomMeetingPayload)
                    .then(meetingCreated => {
                      if (rateLimitPayload.hours <= 24) {
                        callApi('zoomUsers/query', 'post', {purpose: 'updateOne', match: {_id: zoomUser._id}, updated: {$inc: {'meetingsPerDay.apiCalls': 1}}})
                          .then(updated => {
                            sendSuccessResponse(res, 200, {joinUrl: meetingResponse.join_url})
                          })
                          .catch(err => {
                            logger.serverLog(TAG, err, 'error')
                            sendErrorResponse(res, 500, undefined, 'Failed to update api calls count')
                          })
                      } else {
                        callApi('zoomUsers/query', 'post', {purpose: 'updateOne', match: {_id: zoomUser._id}, updated: {meetingsPerDay: {datetime: new Date(), apiCalls: 1}}})
                          .then(updated => {
                            sendSuccessResponse(res, 200, {joinUrl: meetingResponse.join_url})
                          })
                          .catch(err => {
                            logger.serverLog(TAG, err, 'error')
                            sendErrorResponse(res, 500, undefined, 'Failed to update api calls count')
                          })
                      }
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
            } else {
              sendErrorResponse(res, 500, undefined, 'API_LIMIT_REACHED')
            }
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
