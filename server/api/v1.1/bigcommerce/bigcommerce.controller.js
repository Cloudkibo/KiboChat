/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const config = require('./../../../config/environment/index')
const cookie = require('cookie')
const querystring = require('querystring')
const crypto = require('crypto')
const request = require('request-promise')
const TAG = 'api/bigcommerce/bigcommerce.controller.js'
const dataLayer = require('./bigcommerce.datalayer')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const path = require('path')
let BigCommerce = require('node-bigcommerce')

exports.install = function (req, res) {
  const bigCommerce = new BigCommerce({
    clientId: '128ecf542a35ac5270a87dc740918404',
    secret: 'acbd18db4cc2f85cedef654fccc4a4d8',
    callback: 'https://myapplication.com/auth',
    responseType: 'json'
  })

  bigCommerce.authorize(req.query)
    .then(data => res.send(data))
    .catch(err => res.send(err))
}

exports.load = function (req, res) {
  const { shop, hmac, code, state } = req.query
  const stateCookie = cookie.parse(req.headers.cookie).state
  //  const userId = JSON.parse(cookie.parse(req.headers.cookie).userId)
  //  const companyId = JSON.parse(cookie.parse(req.headers.cookie).companyId)
  //  const pageId = cookie.parse(req.headers.cookie).pageId
  if (state !== stateCookie) {
    res.cookie('shopifySetupState', 'Request origin cannot be verified')
    res.clearCookie('shopifyToken')
    res.clearCookie('installByShopifyStore')
    return res.redirect('/errorMessage')
  }

  if (shop && hmac && code) {
    // DONE: Validate request is from Shopify
    const map = Object.assign({}, req.query)
    delete map['signature']
    delete map['hmac']
    const message = querystring.stringify(map)
    const providedHmac = Buffer.from(hmac, 'utf-8')
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', config.shopify.app_secret)
        .update(message)
        .digest('hex'),
      'utf-8'
    )
    let hashEquals = false

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    } catch (e) {
      hashEquals = false
    };

    if (!hashEquals) {
      res.cookie('shopifySetupState', 'HMAC validation failed')
      res.clearCookie('shopifyToken')
      res.clearCookie('installByShopifyStore')
      return res.redirect('/errorMessage')
    }

    // DONE: Exchange temporary code for a permanent access token
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token'
    const accessTokenPayload = {
      client_id: config.shopify.app_key,
      client_secret: config.shopify.app_secret,
      code
    }

    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
      .then((accessTokenResponse) => {
        const accessToken = accessTokenResponse.access_token
        const tokenCookie = cookie.parse(req.headers.cookie).token

        if (tokenCookie) {
          const userIdCookie = cookie.parse(req.headers.cookie).userId
          const companyIdCookie = cookie.parse(req.headers.cookie).companyId
          const shopifyPayload = {
            userId: userIdCookie,
            companyId: companyIdCookie,
            shopUrl: shop,
            shopToken: accessToken
          }
          dataLayer.findOneShopifyIntegration({ companyId: companyIdCookie })
            .then(shopifyIntegration => {
              if (shopifyIntegration) {
                res.cookie('shopifySetupState', 'already exists')
                res.clearCookie('shopifyToken')
                res.clearCookie('installByShopifyStore')
                res.redirect('/alreadyConnected')
              } else {
                dataLayer.createShopifyIntegration(shopifyPayload)
                  .then(savedStore => {
                    logger.serverLog(TAG, 'shopify store integration created', 'debug')
                    res.cookie('shopifySetupState', 'completedUsingAuth')
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    res.redirect('/successMessage')
                  })
                  .catch(err => {
                    res.cookie('shopifySetupState', `Internal Server Error ${err}`)
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    return res.redirect('/errorMessage')
                  })
              }
            })
        } else {
          res.cookie('shopifySetupState', 'startedFromAppNotAuthenticated')
          res.clearCookie('shopifyToken')
          res.clearCookie('installByShopifyStore')
          res.cookie('shopifyToken', accessToken)
          // the login in that screen should redirect to kibochat only
          res.sendFile(path.join(__dirname, '/proceedToIntegratePage.html'))
        }
      })
      .catch((error) => {
        res.cookie('shopifySetupState', `Internal Server Error ${error}`)
        res.clearCookie('shopifyToken')
        res.clearCookie('installByShopifyStore')
        res.status(error.statusCode >= 100 && error.statusCode < 600 ? error.statusCode : 500).send(error.error_description)
      })
  } else {
    res.cookie('shopifySetupState', `Internal Server Error`)
    res.clearCookie('shopifyToken')
    res.clearCookie('installByShopifyStore')
    res.status(400).send('Required parameters missing')
  }
}

exports.uninstall = (req, res) => {
  // function stub
  // Handle app uninstall here
}

exports.fetchStore = (req, res) => {
  dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      const shopify = new EcommerceProviders(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
      return shopify.fetchStoreInfo()
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch shop info ${JSON.stringify(err)}`)
    })
}

exports.testRoute = (req, res) => {
  dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      const shopify = new EcommerceProviders(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
      return shopify.searchProducts('sport')
      // return shopify.createPermalinkForCart({
      // email: 'sojharo@gmail.com',
      // first_name: 'sojharo',
      // last_name: 'mangi'},
      // [{
      // variant_id: 32734085808191,
      // quantity: 1
      // }])
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      console.log(err)
      sendErrorResponse(res, 500, `Failed to fetch subscribers
      ${JSON.stringify(err)}`)
    })
}
