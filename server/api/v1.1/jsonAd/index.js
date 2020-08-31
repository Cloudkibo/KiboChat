const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./jsonAd.controller')
const auth = require('./../../../auth/auth.service')

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.create}),
  controller.create)

router.put('/edit',
  auth.isAuthenticated(),
  validate({body: validationSchema.edit}),
  controller.edit)

router.get('/',
  auth.isAuthenticated(),
  controller.getAll)

router.get('/:id',
  auth.isAuthenticated(),
  controller.getOne)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  controller.deleteOne)

module.exports = router
