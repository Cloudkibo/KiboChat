exports.createPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    }
  }
}

exports.createCommercePayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    storeType: {
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
    },
    dialogFlowAgentId: {
      type: 'string'
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
