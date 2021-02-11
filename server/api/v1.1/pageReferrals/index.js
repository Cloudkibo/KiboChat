const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./pageReferrals.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('messenger_links'),
  auth.isUserAllowedToPerformThisAction('view_messenger_ref_urls'),
  controller.index)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('messenger_links'),
  auth.isUserAllowedToPerformThisAction('view_messenger_ref_urls'),
  controller.view)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_links'),
  auth.isUserAllowedToPerformThisAction('create_messnger_ref_urls'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_links'),
  auth.isUserAllowedToPerformThisAction('update_messenger_ref_urls'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('delete'),
  auth.doesPlanPermitsThisAction('messenger_links'),
  auth.isUserAllowedToPerformThisAction('delete_messenger_ref_urls'),
  controller.delete)

module.exports = router
