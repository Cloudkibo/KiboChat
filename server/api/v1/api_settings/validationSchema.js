/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.apiPayload = {
  type: 'object',
  properties: {
    company_id: {
      type: 'string',
      required: true
    }
  }
}

exports.enablePayload = {
  type: 'object',
  properties: {
    company_id: {
      type: 'string',
      required: true
    }
  }
}
exports.disablePayload = {
  type: 'object',
  properties: {
    company_id: {
      type: 'string',
      required: true
    }
  }
}

exports.resetPayload = {
  type: 'object',
  properties: {
    company_id: {
      type: 'string',
      required: true
    }
  }
}
