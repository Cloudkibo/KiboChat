/**
 * Created by sojharo on 27/07/2017.
 */

const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const dataLayer = require('./facebookShops.datalayer')
const logiclayer = require('./facebookShops.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.testRoute = (req, res) => {
  dataLayer.findOneFacebookShop({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      const shops = new EcommerceProviders(commerceConstants.shops, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: 'EAACQ9dMxl7QBACfTMZAyZBU3FELcMhgsxH33XgMEXIa57RU5lCpGGDhs7huXRlqngkK9ZBRq0yM9o3nXjXB0gkjXBE6zdJ3FTYI3bJJLGWcL79XJqIANABFucZBbBPLts9jYtHngQSSeVQ6gi3rZBFD5KAnjkjvqEmnXbA995eDFC4yN3ueihfWmI9irmfK9uB8oPkmhQ05xSl2ZBL92NERsdRlOvzSVOb4FGPJvTZBtWRRL6xJAZCKBJc7kkBKJ1x8ZD'// shopifyIntegration.shopToken
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

exports.checkFacebookPermissions = async (req, res) => {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  const permissions = await logiclayer.checkFacebookPermissions(facebookInfo)
  sendSuccessResponse(res, 200, {permissionsGiven: permissions})
}

exports.fetchBusinessAccounts = async (req, res) => {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  const shops = new EcommerceProviders(commerceConstants.shops, {
    shopUrl: facebookInfo.fbId,
    shopToken: facebookInfo.fbToken // shopifyIntegration.shopToken
  })

  const businesses = await shops.fetchBusinessAccounts()

  sendSuccessResponse(res, 200, { businesses })
}
