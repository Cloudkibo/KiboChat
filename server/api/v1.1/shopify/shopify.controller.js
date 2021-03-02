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
const logicLayer = require('./shopify.logiclayer')
const dataLayer = require('./shopify.datalayer')
const messengerChatbotDataLayer = require('../chatbots/chatbots.datalayer')
const whatsAppChatbotDataLayer = require('../whatsAppChatbot/whatsAppChatbot.datalayer')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const path = require('path')
const Shopify = require('shopify-api-node')
const { callApi } = require('../utility')
const { sendWhatsAppMessage } = require('../whatsAppEvents/controller')
const { messengerLogicLayer } = require('../messengerEvents/logiclayer')
const { facebookApiCaller } = require('./../../global/facebookApiCaller')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const moment = require('moment')

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
    res.cookie('installByShopifyStore', shop)
    res.cookie('shopifySetupState', 'startedFromApp')
    res.cookie('userId', req.user._id)
    utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
      .then(companyuser => {
        res.cookie('companyId', companyuser.companyId)
        return res.json({ installUrl })
      })
      .catch(err => {
        if (err) {
          const message = err || 'Error in finding companyuser for shopify'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, { user: req.user }, 'error')
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
  }).catch((err) => {
    const message = err || 'Error Creating App Uninstall Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })

  shopify.webhook.create({
    topic: 'orders/create',
    address: `${config.domain}/api/shopify/complete-checkout`,
    format: 'json'
  }).then((response) => {
  }).catch((err) => {
    const message = err || 'Error Creating Shopify Create Order Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })

  shopify.webhook.create({
    topic: 'checkouts/create',
    address: `${config.domain}/api/shopify/checkout-create`,
    format: 'json'
  }).then((response) => {
  }).catch((err) => {
    const message = err || 'Error Creating Shopify Create Checkout Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })

  shopify.webhook.create({
    topic: 'checkouts/update',
    address: `${config.domain}/api/shopify/checkout-create`,
    format: 'json'
  }).then((response) => {
  }).catch((err) => {
    const message = err || 'Error Creating Shopify update Checkout Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })

  shopify.webhook.create({
    topic: 'fulfillments/update',
    address: `${config.domain}/api/shopify/fulfillment`,
    format: 'json'
  }).then((response) => {
  }).catch((err) => {
    const message = err || 'Error Creating Shopify update fulfillment Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })

  shopify.webhook.create({
    topic: 'fulfillments/create',
    address: `${config.domain}/api/shopify/fulfillment`,
    format: 'json'
  }).then((response) => {
  }).catch((err) => {
    const message = err || 'Error Creating Shopify create fulfillment Webhook'
    logger.serverLog(message, `${TAG}: exports.registerWebhooks`, {}, {shop}, 'error')
  })
}

function getContact (companyId, number, customer) {
  return new Promise((resolve, reject) => {
    let query = {
      companyId: companyId,
      $or: [
        {number: number},
        {number: number.replace(/\D/g, '')}
      ]
    }
    callApi(`whatsAppContacts/query`, 'post', query)
      .then(contacts => {
        if (contacts.length > 0) {
          resolve(contacts[0])
        } else {
          callApi(`whatsAppContacts`, 'post', {
            name: customer.first_name + ' ' + customer.last_name,
            number: number,
            companyId: companyId
          }, 'accounts')
            .then(contact => {
              resolve(contact)
            })
            .catch((err) => {
              reject(err)
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

exports.handleCreateCheckout = async function (req, res) {
  try {
    logger.serverLog('handleCreateCheckout', `${TAG}: exports.handleCreateCheckout`, req.body, {header: req.header})
    sendSuccessResponse(res, 200, {status: 'success'})
    if (req.body.customer && req.body.customer.accepts_marketing &&
    req.body.token && req.body.abandoned_checkout_url && req.body.phone && req.body.id) {
      let shopName = req.body.abandoned_checkout_url.split('//')[1]
      shopName = shopName.split('.com')[0]
      const integrations = await dataLayer.findShopifyIntegrations({ shopUrl: { $regex: '.*' + shopName + '.*', $options: 'i' } })
      if (integrations && integrations.length > 0) {
        for (let i = 0; i < integrations.length; i++) {
          let integration = integrations[i]
          const company = await callApi(`companyProfile/query`, 'post', { _id: integration.companyId })
          if (company.whatsApp) {
            const contact = await getContact(integration.companyId, req.body.phone, req.body.customer)
            if (!(contact.commerceCustomerShopify && contact.commerceCustomerShopify.abandonedCheckoutMessageSent)) {
              const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
                shopUrl: integration.shopUrl,
                shopToken: integration.shopToken
              })
              const storeInfo = await ecommerceProvider.fetchStoreInfo()
              const messageBlock = {
                module: {
                  id: company.whatsApp.activeWhatsappBot,
                  type: 'whatsapp_commerce_chatbot'
                },
                title: 'Opt-in Notification',
                uniqueId: '' + new Date().getTime(),
                payload: getOptInReceivePayload(storeInfo.name, company),
                userId: company.ownerId,
                companyId: company._id
              }
              const data = {
                accessToken: company.whatsApp.accessToken,
                accountSID: company.whatsApp.accountSID,
                businessNumber: company.whatsApp.businessNumber
              }
              sendWhatsAppMessage(messageBlock, data, contact.number, company, contact)
            }
            let commerceCustomerShopify = contact.commerceCustomerShopify ? contact.commerceCustomerShopify : req.body.customer
            commerceCustomerShopify.abandonedCheckoutMessageSent = true
            commerceCustomerShopify.abandonedCartInfo = {
              cartRecoveryAttempts: contact.commerceCustomerShopify && contact.commerceCustomerShopify.abandonedCartInfo ? contact.commerceCustomerShopify.abandonedCartInfo.cartRecoveryAttempts : 0,
              abandonedCheckoutUrl: req.body.abandoned_checkout_url,
              abandonedCheckoutId: req.body.id,
              token: req.body.token
            }
            const updateData = {
              query: {_id: contact._id},
              newPayload: { commerceCustomerShopify: commerceCustomerShopify },
              options: {}
            }
            callApi(`whatsAppContacts/update`, 'put', updateData)
          }
        }
      }
    }
  } catch (err) {
    const message = err || 'Error processing shopify create checkout webhook '
    logger.serverLog(message, `${TAG}: exports.handleCreateCheckout`, req.body, {header: req.header}, 'error')
  }
}

function getOptInReceivePayload (storeName, company) {
  let payload = []
  if (company.whatsApp.provider === 'flockSend') {
    payload = [
      {
        text: `Thank you for opting-in from ${storeName}. Now you will receive your order updates, exclusive offers and news on WhatsApp.`,
        componentType: 'text',
        templateArguments: storeName,
        templateName: 'optin_receive',
        templateCode: 'en'
      }
    ]
  } else {
    payload = [
      {
        text: `Thank you for opting-in from ${storeName}. Now you will receive your order updates, exclusive offers and news on WhatsApp.`,
        componentType: 'text'
      }
    ]
  }
  return payload
}

exports.handleCompleteCheckout = async function (req, res) {
  try {
    logger.serverLog('handleCompleteCheckout', `${TAG}: exports.handleCompleteCheckout`, req.body, {header: req.header})
    sendSuccessResponse(res, 200, {status: 'success'})
    if (req.body.email || req.body.phone) {
      const shopUrl = req.headers['x-shopify-shop-domain']
      const shopifyIntegrations = await dataLayer.findShopifyIntegrations({ shopUrl })
      for (const shopifyIntegration of shopifyIntegrations) {
        let query = {
          $or: [], companyId: shopifyIntegration.companyId
        }
        if (req.body.phone) {
          query.$or.push({number: req.body.phone})
          query.$or.push({number: req.body.phone.replace(/\D/g, '')})
        } else {
          query.$or.push({'commerceCustomerShopify.email': req.body.email})
        }
        sendOnWhatsApp(shopUrl, query, req.body, shopifyIntegration)
        sendOnMessenger(shopUrl, query, req.body, shopifyIntegration)
      }
    }
  } catch (err) {
    const message = err || 'Error processing shopify complete checkout webhook '
    logger.serverLog(message, `${TAG}: exports.handleCompleteCheckout`, req.body, {header: req.header}, 'error')
  }
}

async function sendOnMessenger (shopUrl, query, body, shopifyIntegration) {
  const subscribers = await callApi(`subscribers/query`, 'post', query)
  for (const subscriber of subscribers) {
    if (moment().diff(moment(subscriber.lastMessagedAt), 'minutes') >= 15) {
      const company = await callApi(`companyProfile/query`, 'post', { _id: subscriber.companyId })
      const messageBlock = {
        module: {
          id: company.whatsApp.activeWhatsappBot,
          type: 'messenger_commerce_chatbot'
        },
        title: 'Order Confirmation Notification',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Hi ${subscriber.firstName} ${subscriber.lastName}\n Thank you for placing an order at ${shopUrl}.\n\n This is your order number: ${body.name.slice(1)}`,
            componentType: 'text'
          }
        ],
        userId: company.ownerId,
        companyId: company._id
      }
      if (body.order_status_url) {
        messageBlock.payload[0].buttons = [{
          title: 'Status Page',
          type: 'web_url',
          url: body.order_status_url
        }]
      }
      const pages = await callApi('pages/query', 'post', { _id: subscriber.pageId, connected: true })
      const page = pages[0]
      messageBlock.payload.forEach(item => {
        let finalPayload = messengerLogicLayer.prepareSendAPIPayload(subscriber.senderId, item, subscriber.firstName, subscriber.lastName, true)
        facebookApiCaller('v3.2', `me/messages?access_token=${page.accessToken}`, 'post', finalPayload)
          .then(response => {
          })
          .catch(error => {
            const message = error || 'error in sending message'
            return logger.serverLog(message, `${TAG}: exports.sendResponse`, {}, {messageBlock, body: body}, 'error')
          })
      })
    }
  }
  const updateDataMessenger = {
    query: {'commerceCustomer.email': body.email, companyId: shopifyIntegration.companyId},
    newPayload: { shoppingCart: [] },
    options: {}
  }
  callApi(`subscribers/update`, 'put', updateDataMessenger)
}

async function sendOnWhatsApp (shopUrl, query, body, shopifyIntegration) {
  const contacts = await callApi(`whatsAppContacts/query`, 'post', query)
  for (const contact of contacts) {
    const company = await callApi(`companyProfile/query`, 'post', { _id: contact.companyId })
    const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
      shopUrl: shopifyIntegration.shopUrl,
      shopToken: shopifyIntegration.shopToken
    })
    const storeInfo = await ecommerceProvider.fetchStoreInfo()
    let preparedMessage = logicLayer.getOrderConfirmationMessage(contact, shopifyIntegration, company, body, shopUrl, storeInfo.name)
    if (preparedMessage.type) {
      if (preparedMessage.type === 'superNumber') {
        whatsAppMapper(preparedMessage.provider, ActionTypes.SEND_CHAT_MESSAGE, preparedMessage)
      } else {
        sendWhatsAppMessage(preparedMessage.payload, preparedMessage.credentials, contact.number, company, contact)
      }
    }
  }
  const updateDataWhatsApp = {
    query: query,
    newPayload: { shoppingCart: [], 'commerceCustomerShopify.abandonedCartInfo': null },
    options: {multi: true}
  }
  callApi(`whatsAppContacts/update`, 'put', updateDataWhatsApp)
}

exports.handleFulfillment = async function (req, res) {
  try {
    console.log('handleFulfillment', JSON.stringify(req.body))
    sendSuccessResponse(res, 200, {status: 'success'})
    if (req.body.fulfillments && req.body.fulfillments.length > 0) {
      let fulfillment = req.body.fulfillments[0]
      if (fulfillment.tracking_url && fulfillment.tracking_number && req.body.phone) {
        const shopUrl = req.headers['x-shopify-shop-domain']
        let shopifyIntegrations = await dataLayer.findShopifyIntegrations({ shopUrl })
        for (const shopifyIntegration of shopifyIntegrations) {
          if (shopifyIntegration.orderShipment && shopifyIntegration.orderShipment.enabled) {
            let query = {
              $or: [{number: req.body.phone}, {number: req.body.phone.replace(/\D/g, '')}],
              companyId: shopifyIntegration.companyId
            }
            const contacts = await callApi(`whatsAppContacts/query`, 'post', query)
            for (const contact of contacts) {
              const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
                shopUrl: shopifyIntegration.shopUrl,
                shopToken: shopifyIntegration.shopToken
              })
              const storeInfo = await ecommerceProvider.fetchStoreInfo()
              let preparedMessage = logicLayer.getOrderShipmentMessage(contact, shopifyIntegration, fulfillment, storeInfo.name)
              if (preparedMessage.provider) {
                whatsAppMapper(preparedMessage.provider, ActionTypes.SEND_CHAT_MESSAGE, preparedMessage)
              }
            }
          }
        }
      }
    }
  } catch (err) {
    const message = err || 'Error processing shopify fulfillment webhook'
    logger.serverLog(message, `${TAG}: exports.handleFulfillment`, req.body, {header: req.header}, 'error')
  }
}

exports.handleAppUninstall = async function (req, res) {
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  try {
    const shopifyIntegration = await dataLayer.findOneShopifyIntegration({ shopUrl: shopUrl })
    dataLayer.deleteShopifyIntegration({
      shopToken: shopifyIntegration.shopToken,
      shopUrl: shopifyIntegration.shopUrl,
      userId: shopifyIntegration.userId,
      companyId: shopifyIntegration.companyId
    })

    const messengerChatbots = await messengerChatbotDataLayer.findAllChatBots({
      type: 'automated',
      vertical: 'commerce',
      storeType: 'shopify',
      companyId: shopifyIntegration.companyId
    })

    messengerChatbots.forEach(chatbot => {
      messengerChatbotDataLayer.deleteForChatBot({
        _id: chatbot._id
      })
      messageBlockDataLayer.deleteForMessageBlock({
        'module.id': chatbot._id
      })
    })

    const whatsAppChatbots = await whatsAppChatbotDataLayer.fetchAllWhatsAppChatbots({
      type: 'automated',
      vertical: 'commerce',
      storeType: 'shopify',
      companyId: shopifyIntegration.companyId
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
    const message = err || 'Error in handling app uninstall'
    logger.serverLog(message, `${TAG}: exports.handleAppUninstall`, {}, { header: req.header }, 'error')
    return res.status(500).json({ status: 'failed', error: err })
  }
}

exports.callback = function (req, res) {
  const { shop, hmac, code, state } = req.query
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
        const accessToken = accessTokenResponse.access_token
        const tokenCookie = req.headers.cookie ? cookie.parse(req.headers.cookie).token : null
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
                registerWebhooks(shop, accessToken)
                dataLayer.createShopifyIntegration(shopifyPayload)
                  .then(savedStore => {
                    res.cookie('shopifySetupState', 'completedUsingAuth')
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    res.redirect('/successMessage')
                  })
                  .catch(err => {
                    const message = err || 'unable to create shopify integration error'
                    logger.serverLog(message, `${TAG}: exports.callback`, {}, { query: req.query }, 'error')
                    res.cookie('shopifySetupState', `Internal Server Error ${err}`)
                    res.clearCookie('shopifyToken')
                    res.clearCookie('installByShopifyStore')
                    return res.redirect('/errorMessage')
                  })
              }
            })
        } else {
          res.cookie('shopifySetupState', 'startedFromAppNotAuthenticated')
          res.cookie('shopifyToken', accessToken)
          // the login in that screen should redirect to kibochat only
          res.sendFile(path.join(__dirname, '/proceedToIntegratePage.html'))
        }
      })
      .catch((error) => {
        const message = error || 'shopify callback error'
        logger.serverLog(message, `${TAG}: exports.callback`, {}, { query: req.query }, 'error')
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

exports.fetchStore = (req, res) => {
  dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
    .then(shopifyIntegration => {
      if (shopifyIntegration) {
        const shopify = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        return shopify.fetchStoreInfo()
      } else {
        return null
      }
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      const message = err || 'Failed to fetch shop info'
      logger.serverLog(message, `${TAG}: exports.fetchStore`, {}, { user: req.user }, 'error')
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
      return shopify.fetchProductsInThisCategory(333035969, null, 9)
      // return shopify.findCustomerOrders('4573544054966')
      // return shopify.checkOrderStatus('1125')
      // return shopify.cancelAnOrder('3181202735286')
      // return shopify.createPermalinkForCart({
      // email: 'sojharo@gmail.com',
      // first_name: 'sojharo',
      // last_name: 'mangi'},
      // [{
      // variant_id: 32734085808191,
      // quantity: 1
      // }])
      // return shopify.searchProducts('Kurti')
      // return shopify.getVariantsOfSelectedProduct('4885559935039')
      // return shopify.searchCustomerUsingEmail('sojharo@live.com')
      // return shopify.createTestOrder(
      //   { id: '3634555748415' },
      //   [{
      //     variant_id: '33276201402431',
      //     quantity: 2
      //   }],
      //   {
      //     first_name: 'Sojharo',
      //     last_name: 'Mangi',
      //     address1: 'C-23 Fariya Apartments',
      //     city: 'Karachi',
      //     country: 'Pakistan',
      //     zip: '71200'
      //   }
      // )
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch subscribers
      ${JSON.stringify(err)}`)
    })
}
exports.fetchOrders = async (req, res) => {
  try {
    const shopifyIntegration = await dataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
    if (shopifyIntegration) {
      const shopify = new EcommerceProviders(commerceConstants.shopify, {
        shopUrl: shopifyIntegration.shopUrl,
        shopToken: shopifyIntegration.shopToken
      })
      const orders = await shopify.fetchOrders(req.body.limit, req.body.nextPageParameters)
      sendSuccessResponse(res, 200, {orders: orders, nextPageParameters: orders.nextPageParameters})
    } else {
      sendErrorResponse(res, 500, `No Shopify Integration found`)
    }
  } catch (err) {
    const message = err || 'Error fetching orders'
    logger.serverLog(message, `${TAG}: exports.fetchOrders`, req.body, {}, 'error')
  }
}
