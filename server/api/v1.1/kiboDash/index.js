/**
 * Created by sojharo on 25/09/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./operational.controller')
const platform = require('./platform.controller')
const user = require('./user.controller')
const page = require('./page.controller')
const autoposting = require('./autoposting.controller')
const auth = require('../../../auth/auth.service')

router.get('/', auth.isAuthorizedSuperUser(), controller.index)

// Platformwise Data
router.get('/platformwise', auth.isAuthenticated(), auth.isAuthorizedSuperUser(),
  platform.index)

router.post('/platformwise/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), platform.ranged)

// Userwise Data
router.get('/userwise', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), user.index)
router.post('/userwise/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), user.ranged)
router.post('/userwise/oneUser', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), user.oneUser)
router.post('/userwise/oneUser/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), user.oneUserRanged)

// Pagewise Data
router.get('/pagewise', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), page.index)
router.post('/pagewise/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), page.ranged)
router.post('/pagewise/onePage', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), page.onePage)
router.post('/pagewise/onePage/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), page.onePageRanged)
router.post('/pagewise/topPages', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), page.topPages)

// Autoposting Data
router.get('/autoposting/platformwise', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), autoposting.index)
router.post('/autoposting/platformwise/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), autoposting.ranged)
router.post('/autoposting/userwise', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), autoposting.userwise)
router.post('/autoposting/userwise/ranged', auth.isAuthenticated(), auth.isAuthorizedSuperUser(), autoposting.userwiseRanged)

module.exports = router
