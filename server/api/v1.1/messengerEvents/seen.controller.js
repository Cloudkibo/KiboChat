const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  updateChatSeen(req.body.entry[0].messaging[0])
}

function updateChatSeen (req) {
  LiveChatDataLayer.genericUpdate({ recipient_fb_id: req.sender.id, sender_fb_id: req.recipient.id, seen: false }, { seen: true, status: 'seen', seenDateTime: Date.now() })
    .then(updated => {
      utility.callApi('subscribers/query', 'post', { senderId: req.sender.id })
        .then(session => {
          session = session[0]
          require('./../../../config/socketio').sendMessageToClient({
            room_id: session.companyId,
            body: {
              action: 'message_seen',
              payload: {event: 'seen', session: session}
            }
          })
        })
        .catch(err => {
          const message = err || 'ERROR at fetching session'
          return logger.serverLog(message, `${TAG}: exports.updateChatSeen`, {}, { req }, 'error')
        })
    })
    .catch(err => {
      const message = err || 'ERROR at updating LiveChat seen'
      return logger.serverLog(message, `${TAG}: exports.updateChatSeen`, {}, { req }, 'error')
    })
}
