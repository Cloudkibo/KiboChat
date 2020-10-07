const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in seen ${JSON.stringify(req.body)}`)
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
          logger.serverLog(TAG, `ERROR at fetching session ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating LiveChat seen ${JSON.stringify(err)}`)
    })
}
