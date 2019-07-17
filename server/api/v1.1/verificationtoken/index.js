'use strict'

let express = require('express')
let controller = require('./verificationtoken.controller')

let router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/resend', auth.isAuthenticated(), controller.resend)

module.exports = router
