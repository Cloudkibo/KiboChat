exports.createPayload = {
  type: 'object',
  properties: {
    uniqueId: {
      type: 'string',
      required: true
    },
    chatbotId: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'array'
    },
    title: {
      type: 'string',
      required: true
    }
  }
}
