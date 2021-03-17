const express = require('express')
const router = express.Router()
const path = require('path')
const dataLayer = require('./../codpages.datalayer')
const shopifyDataLayer = require('./../../shopify/shopify.datalayer')
const superNumberDataLayer = require('./../datalayer')
const commerceConstants = require('./../../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer')
const mainHtml = require('./confirmation.html')
const logger = require('../../../../components/logger')
const TAG = 'api/superNumber/codpages.controller.js'

router.get('/:contactId/:order', (req, res) => {
  const { contactId, order } = req.params
  dataLayer.findOne({
    contactId,
    order
  })
    .then(async data => {
      if (data) {
        const shopifyIntegrations = await shopifyDataLayer.findShopifyIntegrations({
          companyId: req.body.companyId
        })

        const ecommerceProvider = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegrations[0].shopUrl,
          shopToken: shopifyIntegrations[0].shopToken
        })

        const foundOrder = await ecommerceProvider.checkOrderStatus(req.body.order)

        res.send(mainHtml.renderHtml(data.storeName, data.order, data.storeType, data.companyId, contactId, foundOrder))
      } else {
        res.sendFile(path.join(__dirname, '/404.html'))
      }
    })
    .catch(err => {
      const message = err || 'Error in fetching cod link page data'
      logger.serverLog(message, `${TAG}: exports.addConfirmTag`, {}, {params: req.params}, 'error')
      res.sendFile(path.join(__dirname, '/404.html'))
    })
})

module.exports = router
