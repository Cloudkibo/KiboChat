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
// const Shopify = require('shopify-api-node')
const TAG = 'api/shopify/shopify.controller.js'
const utility = require('../utility')
const dataLayer = require('./shopify.datalayer')

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

  const scopes = 'write_orders, write_products, read_themes, write_themes, read_script_tags, write_script_tags'
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

exports.callback = function (req, res) {
  console.log('HERE FROM SHOPIFY INSTALL CALLBACK')
  const { shop, hmac, code, state } = req.query
  const stateCookie = cookie.parse(req.headers.cookie).state
  //  const userId = JSON.parse(cookie.parse(req.headers.cookie).userId)
  //  const companyId = JSON.parse(cookie.parse(req.headers.cookie).companyId)
  //  const pageId = cookie.parse(req.headers.cookie).pageId
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
          dataLayer.createShopifyIntegration(shopifyPayload)
            .then(savedStore => {
              console.log('STORE IS SAVED IN ACCOUTSN')
              console.log(savedStore)
              res.removeCookie('shopifySetupState')
              res.send('store is created and saved in db ' + savedStore)
            })
            .catch(err => {
              return res.status(500).json({ status: 'failed', error: err })
            })
        } else {
          console.log('AUTH TOKEN NOT FOUND IN COOKIES')
          // TODO REMAINAING
        }
      })
      .catch((error) => {
        res.status(error.statusCode >= 100 && error.statusCode < 600 ? error.statusCode : 500).send(error.error_description)
      })
  } else {
    res.status(400).send('Required parameters missing')
  }
}
