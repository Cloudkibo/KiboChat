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

  fetchUserShippingAddress () {
    // TODO: function stub goes here
  }

  addNewShippingAddress () {
    // TODO: function stub goes here
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
}
