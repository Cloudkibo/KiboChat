/**
 * Created by sojharo on 24/07/2017.
 */

'use strict'

const express = require('express')
const passport = require('passport')
const auth = require('../auth.service')

const router = express.Router()

router.get('/', passport.authenticate('facebook', {
  scope: ['email', 'public_profile', 'pages_show_list', 'pages_messaging_subscriptions', 'manage_pages', 'pages_messaging', 'pages_messaging_phone_number', 'publish_pages', 'ads_read', 'ads_management'], //, 'read_page_mailboxes'],
  failureRedirect: '/',
  session: false
}))

router.get('/callback', passport.authenticate('facebook', {
  failureRedirect: '/',
  session: false
}), auth.fbConnectDone)

router.get('/reauth/shops', passport.authenticate('facebook', {
  authType: 'rerequest',
  // Note: comment out this line in future when FB opens these permissinos from closed beta.
  // These are are for checking order status on Facebook Shops
  // - Sojharo
  // scope: ['business_management', 'catalog_management', 'commerce_account_read_orders', 'commerce_account_manage_orders'],
  scope: ['business_management', 'catalog_management'],
  failureRedirect: '/',
  session: false
}))

router.get('/error', auth.fbConnectError)

module.exports = router
