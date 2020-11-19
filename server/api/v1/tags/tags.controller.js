/**
 * Created by sojharo on 27/07/2017.
 */
const callApi = require('../utility')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/v2/tags/tags.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return sendErrorResponse(res, 404, {}, 'The user account does not belong to any company. Please contact support')
      }
      let queryData = {companyId: companyUser.companyId}
      callApi.callApi('tags/query', 'post', queryData)
        .then(tags => {
          async.each(tags, (singleTag, callback) => {
            callApi.callApi('tags_subscriber/query', 'post', {tagId: singleTag._id})
              .then(tagsSubscribers => {
                for (let i = 0; i < tags.length; i++) {
                  if (tags[i]._id === singleTag._id) {
                    tags[i].status = tagsSubscribers.length > 0 ? 'Assigned' : 'Unassigned'
                    tags[i].subscribersCount = tagsSubscribers.length
                  }
                }
                callback()
              })
              .catch(err => callback(err))
          }, (err) => {
            if (err) {
              const message = err || 'Internal Server Error in fetching tags'
              logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
              return sendErrorResponse(res, 500, {}, `Internal Server Error in fetching tags ${JSON.stringify(err)}`)
            }
            return sendSuccessResponse(res, 200, tags)
          })
        })
        .catch(err => {
          if (err) {
            const message = err || 'Internal Server Error in fetching tags'
            logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
            return sendErrorResponse(res, 500, {}, `Internal Server Error in fetching tags ${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Internal Server Error in fetching tags'
        logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, {}, `Internal Server Error in fetching tags ${JSON.stringify(err)}`)
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.tags !== -1 && companyUsage.tags >= planUsage.tags) {
            return res.status(500).json({
              status: 'failed',
              description: `Your tags limit has reached. Please upgrade your plan to create more tags.`
            })
          } else {
            callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag})
              .then(tags => {
                if (tags.length > 0) {
                  sendErrorResponse(res, 500, '', `Tag with similar name already exists`)
                } else {
                  let tagPayload = {
                    tag: req.body.tag,
                    userId: req.user._id,
                    companyId: req.user.companyId
                  }
                  callApi.callApi('tags/', 'post', tagPayload)
                    .then(newTag => {
                      updateCompanyUsage(req.user.companyId, 'tags', 1)
                      require('./../../../config/socketio').sendMessageToClient({
                        room_id: req.user.companyId,
                        body: {
                          action: 'new_tag',
                          payload: {
                            _id: newTag._id,
                            tag: newTag.tag,
                            status: 'Unassigned',
                            subscribersCount: 0
                          }
                        }
                      })
                      sendSuccessResponse(res, 200, newTag)
                    })
                    .catch(err => {
                      const message = err || 'Internal Server Error in saving tags'
                      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, '', `Internal Server Error in saving tag${JSON.stringify(err)}`)
                    })
                }
              })
              .catch(err => {
                const message = err || 'Failed to fetch tags'
                logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', `Failed to fetch tags ${JSON.stringify(err)}`)
              })
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch company'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Failed to company usage ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch plan usage'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to plan usage ${JSON.stringify(err)}`)
    })
}

exports.rename = function (req, res) {
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tag => {
      tag = tag[0]
      if (tag) {
        callApi.callApi('tags/update', 'put', {query: {companyId: req.user.companyId, tag: req.body.tag}, newPayload: {tag: req.body.newTag}, options: {}})
          .then(newTag => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'tag_rename',
                payload: {
                  tag_id: tag._id,
                  new_tag: req.body.newTag
                }
              }
            })
            sendSuccessResponse(res, 200, 'Tag has been deleted successfully!')
          })
          .catch(err => {
            const message = err || 'Failed to edit tag'
            logger.serverLog(message, `${TAG}: exports.rename`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 404, '', `Failed to edit tag ${err}`)
          })
      } else {
        sendErrorResponse(res, 404, '', 'Tag not found')
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.rename`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.delete = function (req, res) {
  callApi.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tag => {
      tag = tag[0]
      if (tag) {
        async.parallelLimit([
          function (callback) {
            callApi.callApi(`tags/deleteMany`, 'post', {tag: req.body.tag, companyId: req.user.companyId})
              .then(tagPayload => {
                callback(null)
              })
              .catch(err => {
                callback(err)
              })
          },
          function (callback) {
            callApi.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id})
              .then(tagsSubscriber => {
                if (tagsSubscriber.length > 0) {
                  for (let i = 0; i < tagsSubscriber.length; i++) {
                    callApi.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {})
                      .then(result => {
                      })
                      .catch(err => {
                        callback(err)
                      })
                    if (i === tagsSubscriber.length - 1) {
                      callback(null)
                    }
                  }
                } else {
                  callback(null)
                }
              })
              .catch(err => {
                callback(err)
              })
          }
        ], 10, function (err, results) {
          if (err) {
            const message = err || 'Failed to delete tag'
            logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Failed to delete tag ${err}`)
          } else {
            updateCompanyUsage(req.user.companyId, 'tags', -1)
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'tag_remove',
                payload: {
                  tag_id: tag._id
                }
              }
            })
            sendSuccessResponse(res, 200, 'Tag has been deleted successfully!')
          }
        })
      } else {
        sendErrorResponse(res, 404, '', 'Tag not found')
      }
    })
    .catch(err => {
      const message = err || 'Failed to find tag'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to find tags ${err}`)
    })
}

function assignTagToSubscribers (subscribers, tagId, req, callback) {
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let subscriberTagsPayload = {
          tagId: tagId,
          subscriberId: subscriber._id,
          companyId: req.user.companyId
        }
        callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
          .then(newRecord => {
            if (i === subscribers.length - 1) {
              callback(null, 'success')
            }
          })
          .catch(err => callback(err))
      })
      .catch(err => callback(err))
  })
}

exports.assign = function (req, res) {
  let subscribers = req.body.subscribers
  let tagId = req.body.tagId
  async.parallelLimit([
    function (callback) {
      assignTagToSubscribers(subscribers, tagId, req, callback)
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error in Assigning tag'
      logger.serverLog(message, `${TAG}: exports.assign`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in Assigning tag ${JSON.stringify(err)}`)
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_assign',
        payload: {
          tagId: req.body.tagId,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    sendSuccessResponse(res, 200, '', 'Tag assigned successfully')
  })
}

function unassignTagFromSubscribers (subscribers, tagId, req, callback) {
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagId, subscriberId: subscriber._id})
          .then(deleteRecord => {
            if (i === subscribers.length - 1) {
              callback(null, 'success')
            }
          })
          .catch(err => callback(err))
      })
      .catch(err => {
        callback(err)
      })
  })
}

exports.unassign = function (req, res) {
  let subscribers = req.body.subscribers
  let tagId = req.body.tagId
  async.parallelLimit([
    function (callback) {
      unassignTagFromSubscribers(subscribers, tagId, req, callback)
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error in unassigning tag'
      logger.serverLog(message, `${TAG}: exports.assign`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in unassigning tag ${err}`)
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_unassign',
        payload: {
          tagId: req.body.tagId,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    sendSuccessResponse(res, 200, '', 'Tags unassigned successfully')
  })
}

exports.subscribertags = function (req, res) {
  callApi.callApi(`tags_subscriber/query`, 'post', {subscriberId: req.body.subscriberId})
    .then(tagsSubscriber => {
      let payload = []
      for (let i = 0; i < tagsSubscriber.length; i++) {
        payload.push({
          _id: tagsSubscriber[i].tagId._id,
          tag: tagsSubscriber[i].tagId.tag,
          subscriberId: tagsSubscriber[i].subscriberId
        })
      }
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      const message = err || 'Internal server error in fetching tag subscribers'
      logger.serverLog(message, `${TAG}: exports.assign`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal server error in fetching tag subscribers. ${err}`)
    })
}
