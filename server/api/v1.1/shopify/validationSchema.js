exports.storeInfoSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    shopUrl: {
      type: 'string',
      required: true
    },
    shopToken: {
      type: 'string',
      required: true
    }
  }
}

exports.cartInfoSchema = {
  type: 'object',
  properties: {
    shopifyCartId: {
      type: 'string',
      required: true
    },
    cartToken: {
      type: 'string',
      required: true
    },
    storeId: {
      type: 'string',
      required: true
    },
    'linePrice': {
      type: 'string',
      required: true
    },
    productIds: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    }
  }
}

exports.checkoutInfoSchema = {
  type: 'object',
  properties: {
    shopifyCheckoutId: {
      type: 'string',
      required: true
    },
    checkoutToken: {
      type: 'string',
      required: true
    },
    cartToken: {
      type: 'string',
      required: true
    },
    storeId: {
      type: 'string',
      required: true
    },
    totalPrice: {
      type: 'string',
      required: true
    },
    abandonedCheckoutUrl: {
      type: 'string',
      required: true
    },
    productIds: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    }
  }
}
