const logger = require('../../../components/logger')
const needle = require('needle')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`comment_capture/query`, 'post', {companyId: companyUser.companyId}, req.headers.authorization)
        .then(posts => {
          res.status(200).json({
            status: 'success',
            payload: posts
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to get fetch posts ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.viewPost = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'get', {}, req.headers.authorization)
    .then(post => {
      res.status(200).json({
        status: 'success',
        payload: post
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch post ${JSON.stringify(error)}`
      })
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`comment_capture`, 'post', {
        pageId: req.body.pageId,
        companyId: companyUser.companyId,
        userId: req.user._id,
        reply: req.body.reply,
        payload: req.body.payload,
        includedKeywords: req.body.includeKeywords,
        excludedKeywords: req.body.excludedKeywords
      }, req.headers.authorization)
        .then(postCreated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'post_created',
              payload: {
                poll_id: postCreated._id,
                user_id: req.user._id,
                user_name: req.user.name,
                company_id: companyUser.companyId
              }
            }
          })
          utility.callApi(`pages/${req.body.pageId}`, 'get', {}, req.headers.authorization)
            .then(page => {
              let currentUser
              if (req.user.facebookInfo) {
                currentUser = req.user
              } else {
                currentUser = page.userId
              }
              needle.get(
                `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
                (err, resp) => {
                  if (err) {
                    logger.serverLog(TAG,
                      `Page accesstoken from graph api Error${JSON.stringify(err)}`)
                  }
                  console.log('response from pageaccesstoken', resp.body)
                  let messageData = logicLayer.setMessage(req.body.payload)
                  if (messageData.image) {
                    needle.post(
                      `https://graph.facebook.com/${page.pageId}/photos?access_token=${resp.body.access_token}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err)
                        }
                        let postId = resp.body.post_id ? resp.body.post_id : resp.body.id
                        utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}}, req.headers.authorization)
                          .then(result => {
                            res.status(201).json({status: 'success', payload: postCreated})
                          })
                          .catch(error => {
                            return res.status(500).json({
                              status: 'failed',
                              payload: `Failed to create post ${JSON.stringify(error)}`
                            })
                          })
                      })
                  } else if (messageData.video) {
                    needle.post(
                      `https://graph.facebook.com/${page.pageId}/videos?access_token=${resp.body.access_token}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err)
                        }
                        let postId = resp.body.post_id ? resp.body.post_id : resp.body.id
                        utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}}, req.headers.authorization)
                          .then(result => {
                            res.status(201).json({status: 'success', payload: postCreated})
                          })
                          .catch(error => {
                            return res.status(500).json({
                              status: 'failed',
                              payload: `Failed to create post ${JSON.stringify(error)}`
                            })
                          })
                      })
                  } else {
                    needle.post(
                      `https://graph.facebook.com/${page.pageId}/feed?access_token=${resp.body.access_token}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err)
                        }
                        console.log('response from post', resp.body)
                        let postId = resp.body.post_id ? resp.body.post_id : resp.body.id
                        utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}}, req.headers.authorization)
                          .then(result => {
                            res.status(201).json({status: 'success', payload: postCreated})
                          })
                          .catch(error => {
                            return res.status(500).json({
                              status: 'failed',
                              payload: `Failed to create post ${JSON.stringify(error)}`
                            })
                          })
                      })
                  }
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch page ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create post ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.edit = function (req, res) {
  utility.callApi(`comment_capture/update`, 'put', { query: {_id: req.body.postId}, newPayload: {includedKeywords: req.body.includedKeywords, excludedKeywords: req.body.excludedKeywords}, options: {} }, req.headers.authorization)
    .then(result => {
      res.status(201).json({status: 'success', payload: result})
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update post ${JSON.stringify(error)}`
      })
    })
}
exports.delete = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'delete', {}, req.headers.authorization)
    .then(result => {
      res.status(201).json({status: 'success', payload: result})
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to delete post ${JSON.stringify(error)}`
      })
    })
}
