/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const config = require('./../../../config/environment/index')
const cookie = require('cookie')
const nonce = require('nonce')()
const querystring = require('querystring')
const crypto = require('crypto')
const request = require('request-promise')
const TAG = 'api/shopify/shopify.controller.js'
const utility = require('../utility')
const dataLayer = require('./shopify.datalayer')
const messengerChatbotDataLayer = require('../chatbots/chatbots.datalayer')
const whatsAppChatbotDataLayer = require('../whatsAppChatbot/whatsAppChatbot.datalayer')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const path = require('path')
const Shopify = require('shopify-api-node')

exports.index = function (req, res) {
  const shop = req.body.shop
  const scopes = 'read_customers, write_customers, read_checkouts, write_checkouts, write_orders, write_products, read_themes, write_themes, read_script_tags, write_script_tags'
  if (shop) {
    const state = nonce()
    const redirectUri = config.domain + '/api/shopify/callback'
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + config.shopify.app_key +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri

    res.cookie('state', state)
    res.cookie('userId', JSON.stringify(req.user._id))
    res.cookie('pageId', req.body.pageId)
    utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
      .then(companyuser => {
        res.cookie('companyId', JSON.stringify(companyuser.companyId))
        return res.redirect(installUrl)
      })
      .catch(err => {
        if (err) {
          return res.status(500).send('Error in finding companyuser for shopify')
        }
      })
  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request')
  }
}

exports.install = function (req, res) {
  let { shop, hmac } = req.query
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
    return res.status(400).send('HMAC validation failed')
  }

  const scopes = 'read_customers, write_customers, read_checkouts, write_checkouts, write_orders, write_products, read_themes, write_themes, read_script_tags, write_script_tags'
  const state = nonce()
  const redirectUri = config.domain + '/api/shopify/callback'
  const installUrl = 'https://' + shop +
    '/admin/oauth/authorize?client_id=' + config.shopify.app_key +
    '&scope=' + scopes +
    '&state=' + state +
    '&redirect_uri=' + redirectUri

  res.cookie('state', state)
  res.cookie('installByShopifyStore', shop)
  res.cookie('shopifySetupState', 'startedFromApp')
  res.redirect(installUrl)
}

function registerWebhooks (shop, token) {
  const shopify = new Shopify({
    shopName: shop,
    accessToken: token
  })
  shopify.webhook.create({
    topic: 'app/uninstalled',
    address: `${config.domain}/api/shopify/app-uninstall`,
    format: 'json'
  }).then((response) => {
    logger.serverLog(TAG, 'App Uninstall webhook created')
  }).catch((err) => {
    logger.serverLog(TAG, 'Error Creating App Uninstall Webhook' + JSON.stringify(err))
  })
}

exports.handleAppUninstall = async function (req, res) {
  console.log('shopify handleAppUninstall')
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  try {
    const shopifyIntegration = await dataLayer.findOneShopifyIntegration({ shopUrl: shopUrl })
    console.log('shopifyIntegration', shopifyIntegration)
    dataLayer.deleteShopifyIntegration({
      shopToken: shopifyIntegration.shopToken,
      shopUrl: shopifyIntegration.shopUrl,
      userId: shopifyIntegration.userId,
      companyId: shopifyIntegration.companyId
    })

    const messengerChatbots = await messengerChatbotDataLayer.findAllChatBots({
      type: 'automated',
      vertical: 'commerce',
      storeType: 'shopify'
    })

    messengerChatbots.forEach(chatbot => {
      messengerChatbotDataLayer.deleteForChatBot({
        _id: chatbot._id
      })
      messageBlockDataLayer.deleteForMessageBlock({
        'module.id': chatbot._id
      })
    })

    const whatsAppChatbots = await whatsAppChatbotDataLayer.findAllChatBots({
      type: 'automated',
      vertical: 'commerce',
      storeType: 'shopify'
    })

    whatsAppChatbots.forEach(chatbot => {
      whatsAppChatbotDataLayer.deleteForChatBot({
        _id: chatbot._id
      })
      messageBlockDataLayer.deleteForMessageBlock({
        'module.id': chatbot._id
      })
    })
    res.status(200).json({ status: 'success' })
  } catch (err) {
    return res.status(500).json({ status: 'failed', error: err })
  }
}

exports.callback = function (req, res) {
  const { shop, hmac, code, state } = req.query
  logger.serverLog(TAG, `parsing shopify cookie ${req.headers.cookie}`, 'info')
  if (req.headers.cookie) {
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
        logger.serverLog(TAG, `shopify access token response ${JSON.stringify(accessTokenResponse)}`, 'info')
        const accessToken = accessTokenResponse.access_token
        const tokenCookie = req.headers.cookie ? cookie.parse(req.headers.cookie).token : null
        registerWebhooks(shop, accessToken)
        if (tokenCookie) {
          logger.serverLog(TAG, `shopify token cookie ${tokenCookie}`, 'info')
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
                logger.serverLog(TAG, `shopify integration found ${shopifyIntegration}`, 'info')
                res.cookie('shopifySetupState', 'already exists')
                res.clearCookie('shopifyToken')
                res.clearCookie('installByShopifyStore')
                res.redirect('/alreadyConnected')
              } else {
                logger.serverLog(TAG, `no shopify integration found ${shopifyIntegration}`, 'info')
                dataLayer.createShopifyIntegration(shopifyPayload)
                  .then(savedStore => {
                    logger.serverLog(TAG, 'shopify store integration created', 'debug')
                    res.cookie('shopifySetupState', 'completedUsingAuth')
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    res.redirect('/successMessage')
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `unable to create shopify integration error ${err}`, 'error')
                    res.cookie('shopifySetupState', `Internal Server Error ${err}`)
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    return res.redirect('/errorMessage')
                  })
              }
            })
        } else {
          logger.serverLog(TAG, `shopify else condition (tokenCookie)`, 'info')
          res.cookie('shopifySetupState', 'startedFromAppNotAuthenticated')
          res.cookie('shopifyToken', accessToken)
          // the login in that screen should redirect to kibochat only
          res.sendFile(path.join(__dirname, '/proceedToIntegratePage.html'))
        }
      })
      .catch((error) => {
        logger.serverLog(TAG, `shopify callback error ${JSON.stringify(error)}`, 'error')
        res.cookie('shopifySetupState', `Internal Server Error ${error}`)
        res.clearCookie('shopifyToken')
        res.clearCookie('installByShopifyStore')
        res.status(error.statusCode >= 100 && error.statusCode < 600 ? error.statusCode : 500).send(error.error_description)
      })
  } else {
    logger.serverLog(TAG, `shopify else condition (shop && hmac && code)`, 'info')
    res.cookie('shopifySetupState', `Internal Server Error`)
    res.clearCookie('shopifyToken')
    res.clearCookie('installByShopifyStore')
    res.status(400).send('Required parameters missing')
  }
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

exports.eraseCustomerData = (req, res) => {
  sendSuccessResponse(res, 200, {status: 'success',
    description: 'Customer data is not retained on our systems'})
}

exports.getCustomerData = (req, res) => {
  sendSuccessResponse(res, 200, {status: 'success',
    description: 'Customer data is not retained on our systems'})
}

exports.eraseShopData = (req, res) => {
  sendSuccessResponse(res, 200, {status: 'success',
    description: 'Customer data is not retained on our systems.'})
}

exports.testRoute = (req, res) => {
  dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      const shopify = new EcommerceProviders(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
      return shopify.fetchProductsInThisCategory(166185566271)
      // return shopify.findCustomerOrders('3367449755711')
      // return shopify.checkOrderStatus('1037')
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
