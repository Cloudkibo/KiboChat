
/**
 * Created by sojharo on 27/01/2021.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./facebookShops.controller')

router.get('/testRoute',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.testRoute) // this id will be userid

module.exports = router
