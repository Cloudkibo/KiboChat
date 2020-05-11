const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./chatbots.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.put('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.update)

router.get('/:id/details',
  auth.isAuthenticated(),
  controller.details)

router.delete('/:id',
  auth.isAuthenticated(),
  controller.delete)

router.post('/createBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  controller.createBackup)

router.post('/restoreBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  controller.restoreBackup)

module.exports = router
