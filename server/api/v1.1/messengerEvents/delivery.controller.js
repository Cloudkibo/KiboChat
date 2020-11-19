const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  updateChatDelivered(req.body.entry[0].messaging[0])
}

function updateChatDelivered (req) {
  LiveChatDataLayer.genericUpdate({ recipient_fb_id: req.sender.id, sender_fb_id: req.recipient.id, delivered: false }, { delivered: true, deliveryDateTime: Date.now() })
    .then(updated => {
      utility.callApi('subscribers/query', 'post', { senderId: req.sender.id })
        .then(session => {
          session = session[0]
          if (session) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: session.companyId,
              body: {
                action: 'message_delivered',
                payload: {event: 'delivered', session: session}
              }
            })
          }
        })
        .catch(err => {
          const message = err || 'ERROR at fetching session'
          return logger.serverLog(message, `${TAG}: exports.updateChatDelivered`, {}, {req}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'ERROR at updating LiveChat delivered'
      return logger.serverLog(message, `${TAG}: exports.updateChatDelivered`, {}, {req}, 'error')
    })
}
