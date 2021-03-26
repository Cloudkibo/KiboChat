exports.removePyaload = {
  type: 'object',
  properties: {
    chatbotId: {
      type: 'string',
      required: true
    },
    dialogFlowAgentId: {
      type: 'string',
      required: true
    },
    platform: {
      type: 'string',
      required: true
    }
  }
}
