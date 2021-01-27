/**
 * Created by sojharo on 27/07/2017.
 */

const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const dataLayer = require('./facebookShops.datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.testRoute = (req, res) => {
  dataLayer.findOneFacebookShop({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      const shops = new EcommerceProviders(commerceConstants.shops, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: 'EAACQ9dMxl7QBAD4VaITl1CcLFd4avIJkVSU1mBqMv9PZB98tGZCU1vcxkR8Bz7arJUQM1XCDnYz6L3RPFLeldbZAiQkXfCUr5ggMPXRL7zRjinNv1YDQdDNpChzeeZCASZCKU0QJx0alK9CUANlGp5ZAjME94sEExGEKl4SL7ZAO9gaACLa6HbOwyJ695NbY6pP3b7CBU7hRlFibwtnuNkIzKZCGt5DsbNt4jnuZCGSJQEEItwyayhDkyRpQqZBsSXtBoZD'// shopifyIntegration.shopToken
      })
      // return shops.fetchBusinessAccounts()
      // return shops.fetchCommerceCatalogs('2457078727940351')
      // return shops.fetchProducts('1201032280277610')
      return shops.searchProducts('kameez', '1201032280277610')
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      console.log(err)
      sendErrorResponse(res, 500, `Failed to test shops
      ${JSON.stringify(err)}`)
    })
}
