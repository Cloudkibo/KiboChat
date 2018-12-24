/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.findPayload = {
  type: 'object',
  properties: {
    page_id: {
      type: 'string',
      required: true
    },
    user_id: {
      type: 'string',
      required: true
    },
    jsonStructure: {
      type: 'string',
      required: true
    }
  }
}
exports.webviewPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: true
    },
    url: {
      type: 'string',
      required: true
    },
    messenger_extensions: {
      type: 'boolean',
      required: true
    },
    webview_height_ratio: {
      type: 'string',
      required: true
    }
  }
}
