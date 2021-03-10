exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  require('./../../../config/socketio').sendMessageToClient({
    room_id: req.body.companyId,
    body: {
      action: 'Messenger_unsubscribe_subscriber',
      payload: {
        subscriber_id: req.body._id
      }
    }
  })
}
