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
exports.updatePlatformPayload = {
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
    accountSID: {
      type: 'string',
      required: true
    },
    authToken: {
      type: 'string',
      required: true
    },
    sandboxNumber: {
      type: 'string',
      required: true
    },
    sandboxCode: {
      type: 'string',
      required: true
    }
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
