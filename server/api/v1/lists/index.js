const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./lists.controller')

router.get('/allLists',
  auth.isAuthenticated(),
  controller.allLists)

router.post('/getAll',
  auth.isAuthenticated(),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll)

router.post('/createList',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.createList)

router.post('/editList',
  auth.isAuthenticated(),
  validate({body: validationSchema.editPayload}),
  controller.editList)

router.get('/viewList/:id',
  auth.isAuthenticated(),
  controller.viewList)

router.delete('/deleteList/:id',
  auth.isAuthenticated(),
  controller.deleteList)

router.get('/repliedPollSubscribers',
  auth.isAuthenticated(),
  controller.repliedPollSubscribers)

router.get('/repliedSurveySubscribers',
  auth.isAuthenticated(),
  controller.repliedSurveySubscribers)

module.exports = router
