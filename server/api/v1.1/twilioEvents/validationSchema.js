exports.payload = {
  type: 'object',
  properties: {
    To: {
      type: 'string',
      required: true
    },
    From: {
      type: 'string',
      required: true
    },
    Body: {
      type: 'string',
      required: true
    }
  }
}
