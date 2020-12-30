exports.fetchMessageAlertsPayload = {
  type: 'object',
  properties: {
    platform: {
      type: 'string',
      required: true
    }
  }
}
exports.createAlertPayload = {
  type: 'object',
  properties: {
    platform: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: true
    },
    enabled: {
      type: 'boolean',
      required: true
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
exports.updateAlertPayload = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean'
    },
    interval: {
      type: 'number'
    },
    promptCriteria: {
      type: 'string'
    }
  }
}
