/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.teamPayload = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      required: true
    },
    description: {
      type: 'string',
      required: true
    },
    platform: {
      type: 'string',
      required: true
    },
    teamPages: {
      type: 'array',
      items: {
        type: 'string',
        required: false
      }
    },
    agentIds: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    pageIds: {
      type: 'array',
      items: {
        type: 'string',
        required: false
      }
    }
  }
}

exports.teamUpdatePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    },
    description: {
      type: 'string',
      required: true
    },
    teamPages: {
      type: 'array',
      items: {
        type: 'string',
        required: false
      }
    },
    teamPagesIds: {
      type: 'array',
      items: {
        type: 'string',
        required: false
      }
    }
  }
}

exports.agentPayload = {
  type: 'object',
  properties: {
    teamId: {
      type: 'string',
      required: true
    },
    companyId: {
      type: 'string',
      required: false
    },
    agentId: {
      type: 'string',
      required: true
    }
  }
}

exports.pagePayload = {
  type: 'object',
  properties: {
    teamId: {
      type: 'string',
      required: true
    },
    companyId: {
      type: 'string',
      required: false
    },
    pageId: {
      type: 'string',
      required: true
    }
  }
}
