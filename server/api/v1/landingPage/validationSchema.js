exports.createPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    initialState: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          required: true
        },
        description: {
          type: 'string',
          required: true
        },
        pageTemplate: {
          type: 'string',
          required: true
        },
        backgroundColor: {
          type: 'string',
          required: true
        },
        titleColor: {
          type: 'string',
          required: true
        },
        descriptionColor: {
          type: 'string',
          required: true
        },
        buttonText: {
          type: 'string',
          required: true
        },
        mediaType: {
          type: 'string',
          required: true
        },
        mediaLink: {
          type: 'string',
          required: true
        },
        mediaPlacement: {
          type: 'string',
          required: true
        }
      },
      required: true
    },
    submittedState: {
      type: 'object',
      required: true
    },
    optInMessage: {
      type: 'array',
      required: true
    },
    isActive: {
      type: 'boolean'
    }
  }
}
exports.updatePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    initialState: {
      type: 'object',
      properties: {
        _id: {
          type: 'string'
        },
        title: {
          type: 'string',
          required: true
        },
        description: {
          type: 'string',
          required: true
        },
        pageTemplate: {
          type: 'string',
          required: true
        },
        backgroundColor: {
          type: 'string',
          required: true
        },
        titleColor: {
          type: 'string',
          required: true
        },
        descriptionColor: {
          type: 'string',
          required: true
        },
        buttonText: {
          type: 'string',
          required: true
        },
        mediaType: {
          type: 'string',
          required: true
        },
        mediaLink: {
          type: 'string',
          required: true
        },
        mediaPlacement: {
          type: 'string',
          required: true
        }
      },
      required: true
    },
    submittedState: {
      type: 'object',
      required: true
    },
    optInMessage: {
      type: 'array',
      required: true
    },
    isActive: {
      type: 'boolean',
      required: true
    }
  }
}
