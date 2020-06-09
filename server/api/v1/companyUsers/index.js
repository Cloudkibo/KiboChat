const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./companyUserController')

router.post('/update/:id',
  auth.isAuthenticated(),
  controller.update)

module.exports = router
