/**
 * Created by sojharo on 23/11/2020.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./messenger_components.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.edit)

module.exports = router
