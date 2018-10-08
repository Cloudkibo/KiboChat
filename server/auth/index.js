'use strict'

const express = require('express')

const router = express.Router()

const logger = require('../components/logger')
const config = require('../config/environment')
const Users = require('./../api/v1/users/users.model')

const TAG = 'auth/index.js'

// todo see what to do with facebook passport integration
// require('./facebook/passport').setup(Users, config)
require('./local/passport').setup(Users, config)

// router.use('/facebook', require('./facebook'))
router.use('/local', require('./local'))

module.exports = router
