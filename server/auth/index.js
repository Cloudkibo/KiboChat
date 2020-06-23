'use strict'

const express = require('express')

const router = express.Router()

const config = require('../config/environment')
const apiCaller = require('../api/v1/utility')

// todo see what to do with facebook passport integration
require('./facebook/passport').setup(apiCaller, config)
require('./local/passport').setup(apiCaller, config)

router.use('/facebook', require('./facebook'))
router.use('/local', require('./local'))

module.exports = router
