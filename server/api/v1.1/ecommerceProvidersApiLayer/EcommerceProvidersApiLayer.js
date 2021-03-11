const providers = require('./constants.js')
const shopifyProvider = require('./shopifyProvider.js')
const bigCommerceProvider = require('./bigCommerceProvider.js')
const shopsProvider = require('./shopsProvider.js')

module.exports = class EcommerceProvidersApiLayer {
  constructor (eCommerceProvider, eCommerceProviderCredentials) {
    this.verifyParams(eCommerceProvider, eCommerceProviderCredentials)
    this.eCommerceProvider = eCommerceProvider
    this.eCommerceProviderCredentials = eCommerceProviderCredentials
  }

  verifyParams (provider, credentials) {
    if (!provider || (typeof provider !== 'string')) throw new Error('First parameter "provider" is must')
    if (provider === providers.shopify || provider === providers.shops) {
      if (
        credentials &&
        credentials.hasOwnProperty('shopUrl') &&
        credentials.hasOwnProperty('shopToken')
      ) {
        return true
      } else {
        throw new Error('Shopify credentials require "shopUrl" and "shopToken" parameters')
      }
    } else if (provider === providers.bigcommerce) {
      if (
        credentials &&
        credentials.hasOwnProperty('storeHash') &&
        credentials.hasOwnProperty('shopToken')
      ) {
        return true
      } else {
        throw new Error('BigCommerce credentials require "shopToken" parameter')
      }
    } else if (provider === providers.woocommerce) {
      // TODO Implement this in V2
      throw new Error('WooCommerce is not implemented yet')
    }
  }

  fetchBusinessAccounts () {
    if (this.eCommerceProvider === providers.shops) {
      return shopsProvider.fetchBusinessAccounts(this.eCommerceProviderCredentials)
    } else {
      throw new Error('This function is not implemented for this shop type')
    }
  }

  fetchCommerceCatalogs (businessId) {
    if (this.eCommerceProvider === providers.shops) {
      return shopsProvider.fetchCommerceCatalogs(businessId, this.eCommerceProviderCredentials)
    } else {
      throw new Error('This function is not implemented for this shop type')
    }
  }

  fetchStoreInfo () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchStoreInfo(this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchStoreInfo(this.eCommerceProviderCredentials)
    }
  }

  fetchAllProductCategories (paginationParams, catalogId) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchAllProductCategories(paginationParams, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchAllProductCategories(this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.shops) {
      // NOTE: send the catalog id as string in paginationParams,
      return shopsProvider.fetchAllProductCategories(paginationParams, catalogId, this.eCommerceProviderCredentials)
    }
  }

  fetchProducts (paginationParams, numberOfProducts) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProducts(paginationParams, numberOfProducts, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchProducts(numberOfProducts, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.shops) {
      // NOTE: send the catalog id as string in paginationParams,
      // pagination is not supported on this endpoint from fb for now.
      // see this link for updates: https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products
      return shopsProvider.fetchProducts(paginationParams, numberOfProducts, this.eCommerceProviderCredentials)
    }
  }

  searchProducts (query, catalogId) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchProducts(query, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.searchProducts(query, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.shops) {
      // NOTE: send the catalog id as string
      // pagination is not supported on this endpoint from fb for now.
      // see this link for updates: https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products
      return shopsProvider.searchProducts(query, catalogId, this.eCommerceProviderCredentials)
    }
  }

  fetchProductsInThisCategory (id, paginationParams, numberOfProducts) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProductsInThisCategory(id, paginationParams, numberOfProducts, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchProductsInThisCategory(id, numberOfProducts, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.shops) {
      return shopsProvider.fetchProductsInThisCategory(id, numberOfProducts, this.eCommerceProviderCredentials)
    }
  }

  getVariantsOfSelectedProduct (id, paginationParams, numberOfProducts) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getProductVariants(id, paginationParams, numberOfProducts, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.getProductVariants(id, numberOfProducts, this.eCommerceProviderCredentials)
    }
  }

  fetchCustomerAddressUsingId (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getCustomerUsingId(id, this.eCommerceProviderCredentials)
    }
  }

  updateBillingAddressOnCart (billingAddress, cartToken) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.updateBillingAddressOnCart(billingAddress, cartToken, this.eCommerceProviderCredentials)
    }
  }

  updateBillingAddressOnCartBigCommerce (cartId, addressId, address) {
    if (this.eCommerceProvider === providers.shopify) {
      // TODO Implement when we apply for Sales API on shopify
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.updateBillingAddressOnCart(cartId, addressId, address, this.eCommerceProviderCredentials)
    }
  }

  updateShippingAddressOnCart (shippingAddress, cartToken) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.updateShippingAddressOnCart(shippingAddress, cartToken, this.eCommerceProviderCredentials)
    }
  }

  createPermalinkForCart (customer, lineItems) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.createPermalinkForCart(customer, lineItems, this.eCommerceProviderCredentials)
    }
  }

  createPermalinkForCartBigCommerce (cartId) {
    if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.createPermalinkForCart(cartId, this.eCommerceProviderCredentials)
    }
  }

  createCart (customerId, lineItems) {
    if (lineItems.length === 0) {
      throw new Error('lineItems should not be an empty array')
    }
    if (this.eCommerceProvider === providers.shopify) {
      // TODO Implement when we apply for Sales API on shopify
      throw new Error('create cart is not implemented for shopify')
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.createCart(customerId, lineItems, this.eCommerceProviderCredentials)
    }
  }

  viewCart (cartId) {
    if (this.eCommerceProvider === providers.shopify) {
      // TODO Implement when we apply for Sales API on shopify
      throw new Error('view cart is not implemented for shopify')
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.viewCart(cartId, this.eCommerceProviderCredentials)
    }
  }

  updateCart (cartId, itemId, productId, quantity) {
    if (this.eCommerceProvider === providers.shopify) {
      // TODO Implement when we apply for Sales API on shopify
      throw new Error('update cart is not implemented for shopify')
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.updateCart(cartId, itemId, productId, quantity, this.eCommerceProviderCredentials)
    }
  }

  createOrder (cartId) {
    if (this.eCommerceProvider === providers.shopify) {
      // TODO Implement when we apply for Sales API on shopify
      throw new Error('create order is not implemented for shopify')
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.createOrder(cartId, this.eCommerceProviderCredentials)
    }
  }

  createTestOrder (customer, lineItems, address) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.createTestOrder(customer, lineItems, address, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      // TODO Implement when we apply for Sales API on BigCommerce
      throw new Error('create test order is not implemented for bigcommerce')
    }
  }

  checkOrderStatus (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getOrderStatus(id, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.getOrderStatus(id, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.shops) {
      return shopsProvider.getOrderStatus(id, this.eCommerceProviderCredentials)
    }
  }

  checkOrderStatusByRest (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getOrderStatusByRest(id, this.eCommerceProviderCredentials)
    }
  }

  fetchCustomerUsingId (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getCustomerUsingId(id, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.getCustomerUsingId(id, this.eCommerceProviderCredentials)
    }
  }

  searchCustomerUsingPhone (phone) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchCustomerUsingPhone(phone, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.searchCustomerUsingPhone(phone, this.eCommerceProviderCredentials)
    }
  }

  searchCustomerUsingEmail (phone) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchCustomerUsingEmail(phone, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.searchCustomerUsingEmail(phone, this.eCommerceProviderCredentials)
    }
  }

  createCustomer (firstName, lastName, email) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.createCustomer(firstName, lastName, email, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.createCustomer(firstName, lastName, email, this.eCommerceProviderCredentials)
    }
  }

  fetchAbandonedCart (token) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchAbandonedCart(token, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchAbandonedCart(token, this.eCommerceProviderCredentials)
    }
  }

  fetchOrders (limit, paginationParams) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchOrders(limit, paginationParams, this.eCommerceProviderCredentials)
    }
  }

  fetchOrdersCount () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchOrdersCount(this.eCommerceProviderCredentials)
    }
  }

  fetchCheckoutsCount () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchCheckoutsCount(this.eCommerceProviderCredentials)
    }
  }

  fetchCheckouts (limit, paginationParams) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchCheckouts(limit, paginationParams, this.eCommerceProviderCredentials)
    }
  }

  findCustomerOrders (customerId, limit) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.findCustomerOrders(customerId, limit, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.findCustomerOrders(customerId, limit, this.eCommerceProviderCredentials)
    }
  }

  completeCheckout (cartToken) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.completeCheckout(cartToken, this.eCommerceProviderCredentials)
    }
  }

  cancelAnOrder (orderId) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.cancelAnOrder(orderId, this.eCommerceProviderCredentials)
    }
  }
  updateOrderTag (orderId, tags) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.updateOrderTag(orderId, tags, this.eCommerceProviderCredentials)
    }
  }

  cancelAnOrderWithRefund (orderId, amount, currency) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.cancelAnOrderWithRefund(orderId, amount, currency, this.eCommerceProviderCredentials)
    }
  }
}
