/**
 * Created by sojharo on 23/10/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
let Menu = require('./menu.model')
const needle = require('needle')
const _ = require('lodash')
const MenuDataLayer = require('./menu.datalayer')
const callApi = require('../utility')

// Get list of menu items
exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      MenuDataLayer.findOneMenuObjectUsingQuery({companyId: companyUser.companyId}, req.headers.authorization)
        .then(menus => {
          return res.status(200).json({
            status: 'success',
            payload: menus
          })
        })
        .catch(err => {
          logger.serverLog(TAG, `Internal Server Error on fetch ${err}`)
          return res.status(500)
            .json({status: 'failed', description: 'Internal Server Error'})
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.indexByPage = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      MenuDataLayer.findMenuObjectUsingQuery({companyId: companyUser.companyId, pageId: req.body.pageId})
        .then(menus => {
          return res.status(200).json({
            status: 'success',
            payload: menus
          })
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG, `Internal Server Error on fetch ${err}`)
            return res.status(500)
              .json({status: 'failed', description: 'Internal Server Error'})
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        logger.serverLog(TAG, 'The user account does not belong to any company.')
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('pages/query', 'post', {pageId: req.body.pageId, companyId: companyUser.companyId}, req.headers.authorization)
        .then(page => {
          if (!page) {
            logger.serverLog(TAG, 'Page not found')
            return res.status(404).json({
              status: 'failed',
              description: 'Page not found'
            })
          }
          logger.serverLog(TAG, `page retrieved for menu creation: ${JSON.stringify(page)}`)
          MenuDataLayer.findOneMenuObjectUsingQuery({pageId: req.body.pageId})
            .then(info => {
              if (!info) {
                const menu = new Menu({
                  pageId: req.body.pageId,
                  userId: req.body.userId,
                  companyId: companyUser.companyId,
                  jsonStructure: req.body.jsonStructure
                })

                // save model to MongoDB
                menu.save((err, savedMenu) => {
                  if (err) {
                    res.status(500).json({
                      status: 'failed',
                      error: err,
                      description: 'Failed to insert record'
                    })
                    logger.serverLog(TAG, JSON.stringify(err))
                  } else {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: req.body.pageId,
                          user_id: req.user._id,
                          user_name: req.user.name,
                          payload: savedMenu
                        }
                      }
                    })
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page[0].accessToken}`
                    logger.serverLog(TAG, `requestUrl for menu creation ${requestUrl}`)
                    needle.request('post', requestUrl, req.body.payload, {json: true},
                      (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG,
                            `Internal Server Error ${JSON.stringify(err)}`)
                        }
                        if (!err) {
                        }
                        if (JSON.stringify(resp.body.error)) {
                          return res.status(404).json({
                            status: 'error',
                            description: JSON.stringify(resp.body.error)
                          })
                        } else {
                          res.status(201).json({status: 'success', payload: savedMenu})
                        }
                      })
                  }
                })
              } else {
                MenuDataLayer.updateOneMenuObjectUsingQuery({pageId: req.body.pageId}, {jsonStructure: req.body.jsonStructure})
                  .then(updated => {
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page[0].accessToken}`
                    logger.serverLog(TAG, `requestUrl for menu creation ${requestUrl}`)
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: req.body.pageId,
                          user_id: req.user._id,
                          user_name: req.user.name,
                          payload: updated
                        }
                      }
                    })
                    logger.serverLog(TAG, `req.body.payload passed to graph api ${JSON.stringify(req.body.payload)}`)
                    needle.request('post', requestUrl, req.body.payload, {json: true},
                      (err, resp) => {
                        if (!err) {
                        }
                        if (err) {
                          logger.serverLog(TAG,
                            `Internal Server Error ${JSON.stringify(err)}`)
                        }
                        if (JSON.stringify(resp.body.error)) {
                          logger.serverLog(TAG, `Error from facebook graph api: ${JSON.stringify(resp.body.error)}`)
                          return res.status(404).json({
                            status: 'error',
                            description: JSON.stringify(resp.body.error)
                          })
                        } else {
                          Menu.findOne({pageId: req.body.pageId}, (err, info1) => {
                            if (err) {
                              logger.serverLog(TAG,
                                `Internal Server Error ${JSON.stringify(err)}`)
                              return res.status(500).json({
                                status: 'failed',
                                description: 'Failed to find menu. Internal Server Error'
                              })
                            }
                            res.status(201).json({status: 'success', payload: info1})
                          })
                        }
                      })
                  })
                  .catch(err => {
                    if (err) {
                      logger.serverLog(TAG,
                        `Error occurred in finding subscriber${JSON.stringify(
                          err)}`)
                    }
                  })
              }
            })
            .catch(err => {
              if (err) {
                logger.serverLog(TAG,
                  `Internal Server Error ${JSON.stringify(err)}`)
                return res.status(500).json({
                  status: 'failed',
                  description: 'Failed to find menu. Internal Server Error'
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG,
              `Internal Server Error ${JSON.stringify(err)}`)
            return res.status(500).json({
              status: 'failed',
              description: 'Failed to find page. Internal Server Error'
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}
