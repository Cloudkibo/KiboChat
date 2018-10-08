process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const mongoose = require('mongoose')
const config = require('./config/environment/index')

const app = express()

mongoose.connect(config.mongo.uri, config.mongo.options)

require('./config/express')(app)
require('./config/setup')(app, config)
require('./routes')(app)
