/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    customField: {
      type: 'string',
      required: true
    }
  }
}

exports.deletePayload = {
  type: 'object',
  properties: {
    customFieldId: {
      type: 'string',
      required: true
    }
  }
}

exports.updatePayload = {
  type: 'object',
  properties: {
    customFieldId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: true
    },
    description: {
      type: 'string',
      required: true
    }
  }
}
