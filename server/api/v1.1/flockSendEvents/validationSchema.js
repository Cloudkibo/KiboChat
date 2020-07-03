exports.payload = {
  type: 'object',
  properties: {
    message_id: {
      type: 'string',
      required: true
    },
    message: {
      type: 'string',
      required: true
    },
    phone_number: {
      type: 'string',
      required: true
    },
    media_type: {
      type: 'string',
      required: true
    },
    user_id: {
      type: 'string',
      required: true
    }
  }
}
