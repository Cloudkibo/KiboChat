/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.pagePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    pageUserName: {
      type: 'string',
      required: false
    },
    pagePic: {
      type: 'string',
      required: false
    },
    likes: {
      type: 'number',
      required: false
    },
    accessToken: {
      type: 'string',
      required: true
    },
    connected: {
      type: 'boolean',
      required: false
    },
    userId: {
      type: 'string',
      required: false
    },
    companyId: {
      type: 'string',
      required: true
    },
    greetingText: {
      type: 'string',
      required: false
    },
    welcomeMessage: {
      type: 'array',
      required: false
    },
    isWelcomeMessageEnabled: {
      type: 'boolean',
      required: false
    },
    gotPageSubscriptionPermission: {
      type: 'boolean',
      required: false
    }
  }
}

exports.welcomeMessagePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    welcomeMessage: {
      type: 'array',
      items: [
        {
          type: 'object'
        }
      ],
      required: true
    }
  }
}

exports.enableDisableWelcomeMessagePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    isWelcomeMessageEnabled: {
      type: 'boolean',
      required: true
    }
  }
}
