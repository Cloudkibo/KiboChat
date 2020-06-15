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
      type: 'boolean'
    },
    fallbackReply: {
      type: 'array'
    },
    fallbackReplyEnabled: {
      type: 'boolean'
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
