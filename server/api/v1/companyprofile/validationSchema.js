/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/
exports.invitePayload = {
  'type': 'object',
  'properties': {
    name: {
      type: 'string',
      required: true
    },
    email: {
      type: 'string',
      required: true
    }
  }
}
exports.connectSMS = {
  'type': 'object',
  properties: {
    provider: {
      type: 'string',
      required: true
    },
    businessNumber: {
      type: 'string',
      required: true
    }
  }
}

exports.configureSMS = {
  'type': 'object',
  'properties': {
    'planId': { 'type': 'string' },
    'planUniqueId': { 'type': 'string' },
    'stripeToken': { 'type': 'string' },
    'platform': { 'type': 'string' },
    'numberDetails': {
      'type': 'object',
      'properties': {
        'type': {
          'type': 'string',
          'enum': ['new', 'existing']
        },
        'number': { 'type': 'string' },
        'siteId': { 'type': 'number' }
      }
    }
  },
  'required': ['planId', 'stripeToken', 'platform']
}

exports.configureFacebook = {
  'type': 'object',
  'properties': {
    'planId': { 'type': 'string' },
    'planUniqueId': { 'type': 'string' },
    'stripeToken': { 'type': 'string' },
    'platform': { 'type': 'string' }
  },
  'required': ['planId', 'platform']
}

exports.fetchValidCallerIds = {
  'type': 'object',
  'properties': {
    twilio: {
      type: 'object',
      properties: {
        accountSID: {
          type: 'string',
          required: true
        },
        authToken: {
          type: 'string',
          required: true
        }
      }
    }
  }
}
exports.updatePlatformWhatsApp = {
  'type': 'object',
  'properties': {
    accessToken: {
      type: 'string',
      required: true
    },
    businessNumber: {
      type: 'string',
      required: true
    },
    provider: {
      type: 'string',
      required: true
    }
    // accountSID: {
    //   type: 'string',
    //   required: true
    // },
    // authToken: {
    //   type: 'string',
    //   required: true
    // },
    // sandboxNumber: {
    //   type: 'string',
    //   required: true
    // },
    // sandboxCode: {
    //   type: 'string',
    //   required: true
    // }
  }
}
exports.disconnect = {
  'type': 'object',
  'properties': {
    type: {
      type: 'string',
      required: true
    }
  }
}
exports.disableMember = {
  'type': 'object',
  'properties': {
    memberId: {
      type: 'string',
      required: true
    },
    password: {
      type: 'string',
      required: true
    }
  }
}
exports.enableMember = {
  'type': 'object',
  'properties': {
    memberId: {
      type: 'string',
      required: true
    }
  }
}
exports.deleteWhatsAppInfo = {
  'type': 'object',
  'properties': {
    type: {
      type: 'string',
      required: true
    },
    password: {
      type: 'string',
      required: true
    }
  }
}

exports.advancedSettingsPayload = {
  'type': 'object',
  'properties': {
    saveAutomationMessages: {
      type: 'boolean',
      required: true
    }
  }
}
exports.setBusinessHoursPayload = {
  'type': 'object',
  'properties': {
    opening: {
      type: 'string',
      required: true
    },
    closing: {
      type: 'string',
      required: true
    },
    timezone: {
      type: 'string',
      required: true
    }
  }
}
