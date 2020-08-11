const Shopify = require('shopify-api-node')

module.exports = class EcommerceProvidersApiLayer {

  constructor (eCommerceProvider, eCommerceProviderCredentials) {
    this.eCommerceProvider = eCommerceProvider
    this.eCommerceProviderCredentials = eCommerceProviderCredentials
  }

  functionInitiateShopify (eCommerceProviderCredentials) {
    const shopify = new Shopify({
      shopName: eCommerceProviderCredentials.name,
      apiKey: eCommerceProviderCredentials.apiKey,
      password: eCommerceProviderCredentials.password
    })
  }

  fetchAllProductCategories () {
    Shopify.metafield
      .list({
        metafield: { owner_resource: 'product', owner_id: 632910392 }
      })
      .then(
        (metafields) => console.log(metafields),
        (err) => console.error(err)
      );
  }

  fetchProductsInThisCategory () {
    // TODO: function stub goes here
  }

  getVariantsOfSelectedProduct () {
    // TODO: function stub goes here
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

  checkOrderStatus () {
    // TODO: function stub goes here
  }
}
