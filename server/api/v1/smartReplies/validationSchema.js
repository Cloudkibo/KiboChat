/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    botname: {
      type: 'string',
      required: true
    },
    user: {
      type: 'object'
    }
  }
}

exports.editPayload = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'object',
      required: true
    }
  }
}

exports.updateStatusPayload = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
      required: true
    },
    isActive: {
      type: 'boolean',
      required: true
    }
  }
}

exports.botDetailsPayload = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
      required: true
    }
  }
}

exports.waitSubscribersPayload = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
      required: true
    }
  }
}

exports.unAnsweredQueriesPayload = {
  type: 'object',
  properties: {
    botId: {
      type: 'string',
      required: true
    }
  }
}
exports.removeWaitSubscribersPayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    }
  }
}
exports.indexPayload = {
  type: 'object',
  properties: {
    last_id: {
      type: 'string'
    },
    number: {
      type: 'string',
      required: true
    },
    page: {
      type: 'string'
    }
  }
}
