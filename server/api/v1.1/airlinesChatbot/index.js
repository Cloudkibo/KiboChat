/**
 * Created by sojharo on 30/11/2020.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./airlines.controller')

router.get('/fetchChatbot',
  auth.isAuthenticated(),
  controller.fetchChatbot) // this id will be userid

router.get('/testRoute',
  controller.testRoute) // this id will be userid

require('./../airlinesProvidersApiLayer/util').findCityInfo('Seattle')

module.exports = router
