const providers = require('./constants.js')
const shopifyProvider = require('./shopifyProvider.js')

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
    }
  }

  // TODO baqar to test on staging as well
  fetchProducts () {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProducts(this.eCommerceProviderCredentials)
    }
  }

  fetchProductsInThisCategory (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.fetchProductsInThisCategory(id, this.eCommerceProviderCredentials)
    }
  }

  getVariantsOfSelectedProduct (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getProductVariants(id, this.eCommerceProviderCredentials)
    }
  }

  addProductToCart () {
    // TODO: function stub goes here
  }

  viewItemsInCart () {
    // TODO: function stub goes here
  }

  getProductDetails () {
    // TODO: function stub goes here
  }

  placeAnOrder () {
    // TODO: function stub goes here
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

  removeItemFromCart () {
    // TODO: function stub goes here
  }

  updateCartItemsQuantity () {
    // TODO: function stub goes here
  }

  checkOrderStatus (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getOrderStatus(id, this.eCommerceProviderCredentials)
    }
  }

  fetchCustomerUsingId (id) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.getCustomerUsingId(id, this.eCommerceProviderCredentials)
    }
  }

  searchCustomerUsingPhone (phone) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchCustomerUsingPhone(phone, this.eCommerceProviderCredentials)
    }
  }

  searchCustomerUsingEmail (phone) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.searchCustomerUsingEmail(phone, this.eCommerceProviderCredentials)
    }
  }

  createCustomer (firstName, lastName, email) {
    if (this.eCommerceProvider === providers.shopify) {
      return shopifyProvider.createCustomer(firstName, lastName, email, this.eCommerceProviderCredentials)
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
