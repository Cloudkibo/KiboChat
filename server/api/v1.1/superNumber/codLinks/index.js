const express = require('express')
const router = express.Router()
const path = require('path')
const dataLayer = require('./../codpages.datalayer')
const mainHtml = require('./confirmation.html')
const logger = require('../../../../components/logger')
const TAG = 'api/superNumber/codpages.controller.js'

router.get('/:contactId/:order', (req, res) => {
  const { contactId, order } = req.params
  dataLayer.findOne({
    contactId,
    order
  })
    .then(data => {
      if (data) {
        res.send(mainHtml.renderHtml(data.storeName, data.order, data.storeType, data.companyId, contactId))
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
