const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./jsonAd.controller')
const auth = require('./../../../auth/auth.service')

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('json_ads'),
  validate({body: validationSchema.create}),
  controller.create)

router.put('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('json_ads'),
  validate({body: validationSchema.edit}),
  controller.edit)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('json_ads'),
  controller.getAll)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('json_ads'),
  controller.getOne)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('json_ads'),
  controller.deleteOne)

module.exports = router
