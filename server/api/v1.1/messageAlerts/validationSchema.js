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
