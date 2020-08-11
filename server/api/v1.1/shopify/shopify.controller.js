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
const Shopify = require('shopify-api-node')
const TAG = 'api/shopify/shopify.controller.js'
const utility = require('../utility')
const dataLayer = require('./shopify.datalayer')

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

  shopify.webhook.create({
    topic: 'themes/publish',
    address: `${config.domain}/api/shopify/theme-publish`,
    format: 'json'
  }).then((response) => {
    logger.serverLog(TAG, 'Theme Publish webhook created')
  }).catch((err) => {
    logger.serverLog(TAG, 'Error Creating Theme Publish Webhook' + JSON.stringify(err))
  })
}

// const registerScript = function (shopDomain, accessToken, params) {
//   const shopify = new Shopify({ shopName: shopDomain, accessToken: accessToken })
//   shopify.scriptTag.create(params).then(
//     response => logger.serverLog(TAG, 'Script posted and created', response),
//     err => logger.serverLog(TAG, `Error creating script. ${JSON.stringify(err.response.body)}`)
//   )
// }

exports.index = function (req, res) {
  const shop = req.body.shop
  const scopes = 'write_orders, write_products, read_themes, write_themes, read_script_tags, write_script_tags'
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
  // need to have separate page on success of
  // app installation from app store which asks
  // to login or signup to complete the app
  // installation
  // open issue for above
  //
  // also state will be stored in cookie here
  let { shop, hmac } = req.query
  if (shop.indexOf('https://') < 0) {
    shop = 'https://' + shop
  }
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

  res.cookie('installByShopifyStore', shop)
  res.redirect('/')
}

exports.callback = function (req, res) {
  const { shop, hmac, code, state } = req.query
  const stateCookie = cookie.parse(req.headers.cookie).state
  const userId = JSON.parse(cookie.parse(req.headers.cookie).userId)
  const companyId = JSON.parse(cookie.parse(req.headers.cookie).companyId)
  const pageId = cookie.parse(req.headers.cookie).pageId
  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified')
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
      return res.status(400).send('HMAC validation failed')
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
        // registerWebhooks(shop, accessToken)
        // registerScript(shop, accessToken, {
        //   event: 'onload',
        //   src: config.domain + '/api/shopify/serveScript'
        // })
        const store = {
          userId: userId,
          pageId: pageId,
          shopUrl: shop,
          shopToken: accessToken,
          companyId: companyId
        }
        dataLayer.createStoreInfo(store)
          .then(savedStore => {
            const storeAnalytics = {
              storeId: savedStore._id
            }
            return dataLayer.createStoreAnalytics(storeAnalytics)
          })
          .then(storeAnalytics => {
            logger.serverLog(TAG, `Store analytics created ${storeAnalytics}`)
            return res.redirect('/')
          })
          .catch(err => {
            return res.status(500).json({ status: 'failed', error: err })
          })
      })
      .catch((error) => {
        res.status(error.statusCode >= 100 && error.statusCode < 600 ? error.statusCode : 500).send(error.error_description)
      })
  } else {
    res.status(400).send('Required parameters missing')
  }
}
