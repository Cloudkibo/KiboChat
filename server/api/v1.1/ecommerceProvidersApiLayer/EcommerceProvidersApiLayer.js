const providers = require('./constants.js')
const shopifyProvider = require('./shopifyProvider.js')
const bigCommerceProvider = require('./bigCommerceProvider.js')

module.exports = class EcommerceProvidersApiLayer {
  constructor (eCommerceProvider, eCommerceProviderCredentials) {
    this.verifyParams(eCommerceProvider, eCommerceProviderCredentials)
    this.eCommerceProvider = eCommerceProvider
    this.eCommerceProviderCredentials = eCommerceProviderCredentials
  }

  verifyParams (provider, credentials) {
    if (!provider || (typeof provider !== 'string')) throw new Error('First parameter "provider" is must')
    if (provider === providers.shopify) {
      if (
        credentials.hasOwnProperty('shopUrl') &&
        credentials.hasOwnProperty('shopToken')
      ) {
        return true
      } else {
        throw new Error('Shopify credentials require "shopUrl" and "shopToken" parameters')
      }
    } else if (provider === providers.bigcommerce) {
      if (
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

  fetchStoreInfo () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchStoreInfo(this.eCommerceProviderCredentials)
    }
  }

  fetchAllProductCategories () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchAllProductCategories(this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchAllProductCategories(this.eCommerceProviderCredentials)
    }
  }

  fetchProducts () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProducts(this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchProducts(this.eCommerceProviderCredentials)
    }
  }

  searchProducts (query) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchProducts(query, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.searchProducts(query, this.eCommerceProviderCredentials)
    }
  }

  fetchProductsInThisCategory (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProductsInThisCategory(id, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.fetchProductsInThisCategory(id, this.eCommerceProviderCredentials)
    }
  }

  getVariantsOfSelectedProduct (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getProductVariants(id, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.getProductVariants(id, this.eCommerceProviderCredentials)
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

  checkOrderStatus (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getOrderStatus(id, this.eCommerceProviderCredentials)
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

  findCustomerOrders (customerId, limit) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.findCustomerOrders(customerId, limit, this.eCommerceProviderCredentials)
    } else if (this.eCommerceProvider === providers.bigcommerce) {
      return bigCommerceProvider.findCustomerOrders(customerId, limit, this.eCommerceProviderCredentials)
    }
  }

  addOrUpdateProductToCart (customerId, lineItems, cartToken) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.addOrUpdateProductToCart(customerId, lineItems, cartToken, this.eCommerceProviderCredentials)
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

  cancelAnOrderWithRefund (orderId, amount, currency) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.cancelAnOrderWithRefund(orderId, amount, currency, this.eCommerceProviderCredentials)
    }
  }
}
