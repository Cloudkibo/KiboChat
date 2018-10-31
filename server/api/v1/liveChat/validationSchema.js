/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    sender_id: {
      type: 'string',
      required: true
    },
    recipient_id: {
      type: 'string',
      required: true
    },
    sender_fb_id: {
      type: 'string',
      required: true
    },
    recipient_fb_id: {
      type: 'string',
      required: true
    },
    session_id: {
      type: 'string',
      required: true
    },
    company_id: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'string',
      required: true
    },
    replied_by: {
      type: 'string',
      required: true
    }
  }
}

exports.updatePayload = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      required: true
    },
    urlmeta: {
      type: 'string',
      required: true
    }
  }
}

exports.urlMetaPayload = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: false
    }
  }
}

exports.searchPayload = {
  type: 'object',
  properties: {
    session_id: {
      type: 'string',
      required: true
    },
    text: {
      type: 'string',
      required: true
    }
  }
}

exports.indexPayload = {
  type: 'object',
  properties: {
  }
}
