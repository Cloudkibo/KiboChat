exports.fetchMessageAlertsPayload = {
  type: 'object',
  properties: {
    platform: {
      type: 'string',
      required: true
    }
  }
}
exports.saveAlertPayload = {
  type: 'object',
  properties: {
    platform: {
      type: 'string'
    },
    type: {
      type: 'string'
    },
    enabled: {
      type: 'boolean'
    },
    interval: {
      type: 'number'
    },
    intervalUnit: {
      type: 'string'
    },
    promptCriteria: {
      type: 'string'
    }
  }
}
exports.subscribePayload = {
  type: 'object',
  properties: {
    platform: {
      type: 'string',
      required: true
    },
    channel: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    },
    channelId: {
      type: 'string',
      required: true
    },
    profilePic: {
      type: 'string'
    }
  }
}
