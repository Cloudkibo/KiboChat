const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./lists.controller')

router.get('/allLists',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  controller.allLists)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll)

router.post('/createList',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('create_segmentation_lists'),
  validate({body: validationSchema.createPayload}),
  controller.createList)

router.post('/editList',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('update_segmentation_lists'),
  validate({body: validationSchema.editPayload}),
  controller.editList)

router.get('/viewList/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  controller.viewList)

router.delete('/deleteList/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('delete_segmentation_lists'),
  controller.deleteList)

module.exports = router
