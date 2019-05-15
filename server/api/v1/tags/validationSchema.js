/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    tag: {
      type: 'string',
      required: true
    }
  }
}

exports.renamePayload = {
  type: 'object',
  properties: {
    tag: {
      type: 'string',
      required: true
    },
    newTag: {
      type: 'string',
      required: true
    }
  }
}

exports.deletePayload = {
  type: 'object',
  properties: {
    tag: {
      type: 'string',
      required: true
    }
  }
}

exports.assignPayload = {
  type: 'object',
  properties: {
    tag: {
      type: 'string',
      required: true
    },
    subscribers: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  }
}

exports.subscriberTagsPayload = {
  type: 'object',
  properties: {
    subscriberId: {
      type: 'string',
      required: true
    }
  }
}

exports.queryPayload = {
  type: 'object',
  properties: {
    query: {
      type: 'object',
      required: true
    }
  }
}
