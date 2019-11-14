/**
 * Created by sojharo on 24/11/2017.
 */
const express = require('express')

const router = express.Router()
var cors = require('cors')

const controller = require('./messageStatistics.controller')

router.get('/:name', cors(),
  controller.index)

module.exports = router
