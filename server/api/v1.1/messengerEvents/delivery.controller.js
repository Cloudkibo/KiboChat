const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in delivery ${JSON.stringify(req.body)}`)
  updateChatDelivered(req.body.entry[0].messaging[0])
}

function updateChatDelivered (req) {
  LiveChatDataLayer.genericUpdate({ recipient_fb_id: req.sender.id, sender_fb_id: req.recipient.id, delivered: false }, { delivered: true, deliveryDateTime: Date.now() })
    .then(updated => {
      logger.serverLog(TAG, `Livechat delivered updated successfully`)
      utility.callApi('subscribers/query', 'post', { senderId: req.sender.id })
        .then(session => {
          console.log('Sessions', session)
          session = session[0]
          require('./../../../config/socketio').sendMessageToClient({
            room_id: session.companyId,
            body: {
              action: 'message_delivered',
              payload: {event: 'delivered', session: session}
            }
          })
        })
        .catch(err => {
          logger.serverLog(TAG, `ERROR at fetching session ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating LiveChat delivered ${JSON.stringify(err)}`)
    })
}
