/**
 * Created by sojharo on 24/11/2017.
 */
const express = require('express')

const router = express.Router()

const controller = require('./api_ngp.controller')
const auth = require('../../../auth/auth.service')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.index)

router.post('/enable',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.enable)

router.post('/disable',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.disable)

router.post('/save',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.save)

module.exports = router
