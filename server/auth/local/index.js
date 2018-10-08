'use strict'

var express = require('express')
var passport = require('passport')
var auth = require('../auth.service')

var router = express.Router()

router.post('/', function (req, res, next) {
  if (req.body.email) {
    passport.authenticate('email-local', function (err, user, info) {
      var error = err || info
      if (error) return res.status(501).json({status: 'failed', description: 'Internal Server Error', error: '' + JSON.stringify(error)})
      if (!user) return res.json(404).json({message: 'User Not Found'})
      req.user = user
      return auth.setTokenCookie(req, res)
    })(req, res, next)
  } else if (req.body.phone) {
    passport.authenticate('phone-local', function (err, user, info) {
      var error = err || info
      if (error) return res.status(501).json({status: 'failed', description: 'Internal Server Error'})
      if (!user) return res.json(404).json({message: 'User Not Found'})
      req.user = user
      return auth.setTokenCookie(req, res)
    })(req, res, next)
  }
})

module.exports = router
