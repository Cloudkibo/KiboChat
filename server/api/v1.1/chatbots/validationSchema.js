exports.createPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    }
  }
}

exports.updatePayload = {
  type: 'object',
  properties: {
    chatbotId: {
      type: 'string',
      required: true
    },
    published: {
      type: 'boolean',
      required: true
    }
  }
}

exports.backupPayload = {
  type: 'object',
  properties: {
    chatbotId: {
      type: 'string',
      required: true
    }
  }
}
