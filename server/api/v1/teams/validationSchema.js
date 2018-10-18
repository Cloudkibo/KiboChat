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
    created_by: {
      type: 'string',
      required: true
    },
    companyId: {
      type: 'string',
      required: true
    },
    teamPages: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    teamPagesIds: {
      type: 'array',
      items: {
        type: 'string',
        required: true
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
        required: true
      }
    },
    teamPagesIds: {
      type: 'array',
      items: {
        type: 'string',
        required: true
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
