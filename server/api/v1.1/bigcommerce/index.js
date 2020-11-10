/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./bigcommerce.controller')

router.get('/install', // handle installing of app from bigcommerce app store
  controller.install)

router.get('/load',
  controller.load) // this id will be userid

router.get('/uninstall',
  controller.uninstall) // this id will be userid

router.get('/redirect',
  controller.redirect)

router.get('/fetchStore',
  auth.isAuthenticated(),
  controller.fetchStore) // this id will be userid

router.get('/testRoute',
  auth.isAuthenticated(),
  controller.testRoute) // this id will be userid

module.exports = router
