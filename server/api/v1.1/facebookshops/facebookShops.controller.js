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
        shopToken: 'EAACQ9dMxl7QBANsrpTZAyBiJr9M8PKnQqDEA2ZBPXOe6ZCOYqDk41o1hWZBm2EJTEyl1fq5ZCP0MhO6VQyGwzf2k2b49XC4DnV1WllpWJWyGvsZADli9uQBHm0lEbfTSzFTQCSLKlfjt4b2BZCR7k6a41Ol3W2uOYibgnI51ZApSuHKJxf0if32e3qlpBXDI4VLx8eAotK7sbddKPZCPDSLrm'// shopifyIntegration.shopToken
      })
      // return shops.fetchBusinessAccounts()
      // return shops.fetchCommerceCatalogs('2457078727940351')
      return shops.fetchProducts('1201032280277610')
      // return shops.searchProducts('kameez', '1201032280277610')
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
  sendSuccessResponse(res, 200, businesses.data)
}

exports.fetchCatalogs = async (req, res) => {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  const shops = new EcommerceProviders(commerceConstants.shops, {
    shopUrl: facebookInfo.fbId,
    shopToken: facebookInfo.fbToken // shopifyIntegration.shopToken
  })

  const result = await shops.fetchCommerceCatalogs(req.params.businessId)
  sendSuccessResponse(res, 200, result.data)
}
