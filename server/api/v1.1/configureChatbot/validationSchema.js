exports.createChatbotPayload = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: true
    }
  }
}

exports.updateChatbotPayload = {
  type: 'object',
  properties: {
    title: {
      type: 'string'
    },
    chatbotId: {
      type: 'string',
      required: true
    },
    published: {
      type: 'boolean'
    },
    dialogFlowAgentId: {
      type: 'string'
    }
  }
}

exports.createChatbotBlockPayload = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: true
    },
    chatbotId: {
      type: 'string',
      required: true
    },
    uniqueId: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'array',
      required: true
    },
    options: {
      type: 'array',
      required: true
    },
    triggers: {
      type: 'array',
      required: true
    }
  }
}

exports.deleteChatbotBlockPayload = {
  type: 'object',
  properties: {
    ids: {
      type: 'array',
      required: true
    }
  }
}
