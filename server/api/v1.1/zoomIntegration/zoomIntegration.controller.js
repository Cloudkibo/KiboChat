const logger = require('../../../components/logger')
const TAG = '/api/v1/zoomIntegration/zoomIntegration.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { zoomApiCaller, refreshAccessToken } = require('../../global/zoom')
const logicLayer = require('./logicLayer')
const { saveNotification } = require('../../global/notifications')
const { sendNotifications } = require('../../global/sendNotification')
const sessionLogicLayer = require('../sessions/sessions.logiclayer')
exports.getZoomUsers = function (req, res) {
  callApi('zoomUsers/query', 'post', {purpose: 'findAll', match: {companyId: req.user.companyId, connected: true}})
    .then(zoomUsers => {
      if (zoomUsers.length > 0) {
        sendSuccessResponse(res, 200, zoomUsers)
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
  callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {_id: data.zoomUserId, connected: true}})
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
                  data.joinUrl = meetingResponse.join_url
                  _sendNotification(data, req.user.companyId)
                  const zoomMeetingPayload = logicLayer.prepareZoomMeetingPayload(data, meetingResponse)
                  callApi('zoomMeetings', 'post', zoomMeetingPayload)
                    .then(meetingCreated => {
                      if (rateLimitPayload.hours <= 24) {
                        callApi('zoomUsers', 'put', {purpose: 'updateOne', match: {_id: zoomUser._id}, updated: {$inc: {'meetingsPerDay.apiCalls': 1}}})
                          .then(updated => {
                            sendSuccessResponse(res, 200, {joinUrl: meetingResponse.join_url})
                          })
                          .catch(err => {
                            logger.serverLog(TAG, err, 'error')
                            sendErrorResponse(res, 500, undefined, 'Failed to update api calls count')
                          })
                      } else {
                        callApi('zoomUsers', 'put', {purpose: 'updateOne', match: {_id: zoomUser._id}, updated: {meetingsPerDay: {datetime: new Date(), apiCalls: 1}}})
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

const _sendNotification = (data, companyId) => {
  callApi(`subscribers/${data.subscriberId}`, 'get', {}, 'accounts', data.authorization)
    .then(subscriber => {
      callApi(`companyUser/queryAll`, 'post', {companyId: companyId}, 'accounts')
        .then(companyUsers => {
          let lastMessageData = sessionLogicLayer.getQueryData('', 'aggregate', {company_id: companyId}, undefined, undefined, undefined, {_id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
          callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
            .then(gotLastMessage => {
              subscriber.lastPayload = gotLastMessage[0].payload
              subscriber.lastRepliedBy = gotLastMessage[0].replied_by
              subscriber.lastDateTime = gotLastMessage[0].datetime
              const notificationMessage = `A zoom meeting has been created to handle subscriber - ${subscriber.firstName} ${subscriber.lastName} query.`
              companyUsers = companyUsers.filter((m) => data.userId !== m.userId._id)
              if (subscriber.is_assigned && subscriber.assigned_to.type === 'team') {
                callApi(`teams/agents/query`, 'post', {companyId: data.companyId, teamId: subscriber.assigned_to.id}, 'accounts', data.authorization)
                  .then(agents => {
                    const userIds = agents.map((a) => data.userId !== a.agentId._id && a.agentId._id)
                    companyUsers = companyUsers.filter(companyUser => {
                      if (userIds.includes(companyUser.userId._id)) {
                        return companyUser
                      }
                    })
                    sendNotifications('Zoom Meeting', notificationMessage, subscriber, companyUsers)
                    saveNotification(
                      userIds,
                      data.companyId,
                      notificationMessage,
                      {type: 'zoom_meeting', joinUrl: data.joinUrl}
                    )
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch members ${err}`, 'error')
                  })
              } else if (!subscriber.is_assigned) {
                sendNotifications('Zoom Meeting', notificationMessage, subscriber, companyUsers)
                callApi(`companyprofile/members`, 'get', {}, 'accounts', data.authorization)
                  .then(members => {
                    const userIds = members.map((m) => data.userId !== m.userId._id && m.userId._id)
                    saveNotification(
                      userIds,
                      data.companyId,
                      notificationMessage,
                      {type: 'zoom_meeting', joinUrl: data.joinUrl}
                    )
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch members ${err}`, 'error')
                  })
              }
            }).catch(error => {
              logger.serverLog(TAG, `Error while fetching Last Message ${error}`, 'error')
            })
        }).catch(error => {
          logger.serverLog(TAG, `Error while fetching companyUser ${error}`, 'error')
        })
    }).catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
    })
}
