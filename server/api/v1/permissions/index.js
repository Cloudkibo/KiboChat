const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./permissions.controller')

router.post('/updatePermissions',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePermissions}),
  auth.hasRole('buyer'),
  controller.updatePermissions)

router.get('/fetchPermissions',
  auth.isAuthenticated(),
  controller.fetchPermissions)

router.get('/fetchUserPermissions',
  auth.isAuthenticated(),
  controller.fetchUserPermissions)

router.post('/changePermissions',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePermissions}),
  auth.hasRole('buyer'),
  controller.changePermissions)

module.exports = router
