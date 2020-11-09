const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/zoomEvents/controller.js'
const { zoomApiCaller } = require('../../global/zoom')
const config = require('../../../config/environment')

exports.uninstallApp = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const uninstallPayload = req.body.payload
  callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {zoomId: uninstallPayload.user_id}})
    .then(zoomUser => {
      if (uninstallPayload.user_data_retention === 'true') {
        callApi('zoomUsers', 'put', {purpose: 'updateAll', match: {zoomId: uninstallPayload.user_id}, updated: {connected: false}})
          .then(updated => {
            _sendSocketEvent(uninstallPayload, zoomUser)
          })
          .catch(err => {
            const message = err || 'error in uninstall app'
            logger.serverLog(message, `${TAG}: exports.uninstallApp`, req.body, {}, 'error')
          })
      } else {
        callApi('zoomUsers', 'delete', {purpose: 'deleteMany', match: {zoomId: uninstallPayload.user_id}})
          .then(deleted => {
            const complianceBody = {
              client_id: config.zoomClientId,
              user_id: uninstallPayload.user_id,
              account_id: uninstallPayload.account_id,
              deauthorization_event_received: uninstallPayload,
              compliance_completed: true
            }
            zoomApiCaller('post', 'oauth/data/compliance', complianceBody, {type: 'basic'}, false)
              .then(complianceResponse => {
                _sendSocketEvent(uninstallPayload, zoomUser)
              })
              .catch(err => {
                const message = err || 'error in uninstall app'
                logger.serverLog(message, `${TAG}: exports.uninstallApp`, req.body, {}, 'error')
              })
          })
          .catch(err => {
            const message = err || 'error in uninstall app'
            logger.serverLog(message, `${TAG}: exports.uninstallApp`, req.body, {}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'error in uninstall app'
      logger.serverLog(message, `${TAG}: exports.uninstallApp`, req.body, {}, 'error')
    })
}

const _sendSocketEvent = (uninstallPayload, zoomUser) => {
  require('./../../../config/socketio').sendMessageToClient({
    room_id: zoomUser.companyId,
    body: {
      action: 'zoom_uninstall',
      payload: zoomUser
    }
  })
}
