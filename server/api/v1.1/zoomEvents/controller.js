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
  if (uninstallPayload.user_data_retention === 'true') {
    callApi('zoomUsers', 'put', {purpose: 'updateOne', match: {zoomId: uninstallPayload.user_id}, updated: {connected: false}})
      .then(updated => {
        logger.serverLog(TAG, 'zoom disconnected successfully')
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
      })
  } else {
    callApi('zoomUsers', 'delete', {purpose: 'deleteOne', match: {zoomId: uninstallPayload.user_id}})
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
            logger.serverLog(TAG, `zoom disconnected successfully and data has been removed ${JSON.stringify(complianceResponse.body)}`)
            _sendSocketEvent(uninstallPayload)
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
      })
  }
}

const _sendSocketEvent = (uninstallPayload) => {
  callApi('zoomUsers', 'post', {purpose: 'findOne', match: {zoomId: uninstallPayload.user_id}})
    .then(zoomUser => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: zoomUser.companyId,
        body: {
          action: 'zoom_uninstall',
          payload: zoomUser
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}
