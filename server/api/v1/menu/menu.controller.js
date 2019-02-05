/**
 * Created by sojharo on 23/10/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const needle = require('needle')
const callApi = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')

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
      callApi.callApi('menu/query', 'post', {companyId: companyUser.companyId}, req.headers.authorization)
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
      callApi.callApi('pages/query', 'post', {pageId: req.body.pageId, companyId: companyUser.companyId, connected: true}, req.headers.authorization)
        .then(page => {
          page = page[0]
          callApi.callApi('menu/query', 'post', {companyId: companyUser.companyId, pageId: page._id}, req.headers.authorization)
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
      callApi.callApi('pages/query', 'post', {pageId: req.body.pageId, companyId: companyUser.companyId, connected: true}, req.headers.authorization)
        .then(page => {
          page = page[0]
          if (!page) {
            logger.serverLog(TAG, 'Page not found')
            return res.status(404).json({
              status: 'failed',
              description: 'Page not found'
            })
          }
          logger.serverLog(TAG, `page retrieved for menu creation: ${JSON.stringify(page)}`)
          callApi.callApi('menu/query', 'post', {pageId: page._id}, req.headers.authorization)
            .then(info => {
              info = info[0]
              if (!info) {
                callApi.callApi('menu', 'post', {
                  pageId: page._id,
                  userId: req.body.userId,
                  companyId: companyUser.companyId,
                  jsonStructure: req.body.jsonStructure
                }, req.headers.authorization)
                  .then(savedMenu => {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: page._id,
                          user_id: req.user._id,
                          user_name: req.user.name,
                          payload: savedMenu
                        }
                      }
                    })
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`
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
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error ${JSON.stringify(err)}`
                    })
                  })
              } else {
                callApi.callApi('menu/update', 'put', {
                  query: {pageId: page._id},
                  newPayload: {jsonStructure: req.body.jsonStructure},
                  options: {}
                }, req.headers.authorization)
                  .then(updated => {
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`
                    logger.serverLog(TAG, `requestUrl for menu creation ${requestUrl}`)
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: page._id,
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
                          callApi.callApi('menu/query', 'post', {pageId: page._id}, req.headers.authorization)
                            .then(info1 => {
                              info1 = info1[0]
                              res.status(201).json({status: 'success', payload: info1})
                            })
                            .catch(err => {
                              if (err) {
                                logger.serverLog(TAG, `Error occurred in finding menu${JSON.stringify(err)}`)
                              }
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
exports.addWebview = function (req, res) {
  broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
    .then(result => {
      if (result.returnValue) {
        return res.status(200).json({
          status: 'success',
          payload: {type: req.body.type, url: req.body.url, title: req.body.title}
        })
      } else {
        return res.status(500).json({status: 'failed', payload: `The given domain is not whitelisted. Please add it to whitelisted domains.`})
      }
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to find whitelisted_domains ${JSON.stringify(error)}`})
    })
}
