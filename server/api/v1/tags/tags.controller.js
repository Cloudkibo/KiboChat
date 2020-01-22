/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/tags/tags.controller.js'
const callApi = require('../utility')
const needle = require('needle')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let aggregateData = [
        {$match: {companyId: companyUser.companyId, defaultTag: false, isList: false}},
        {$group: {_id: '$tag', doc: {$first: '$$ROOT'}}}
      ]
      callApi.callApi('tags/aggregate', 'post', aggregateData)
        .then(tags => {
          tags = tags.map((t) => t.doc)
          let finalTags = []
          async.each(tags, (singleTag, callback) => {
            callApi.callApi('tags_subscriber/query', 'post', {tagId: singleTag._id})
              .then(tagsSubscribers => {
                singleTag.status = tagsSubscribers.length > 0 ? 'Assigned' : 'Unassigned'
                singleTag.subscribersCount = tagsSubscribers.length
                finalTags.push(singleTag)
                callback()
              })
              .catch(err => callback(err))
          }, (err) => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in fetching tags${JSON.stringify(err)}`
              })
            }
            res.status(200).json({status: 'success', payload: finalTags})
          })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in fetching tags${JSON.stringify(err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error in fetching customer${JSON.stringify(err)}`
        })
      }
    })
}

function createTag (req, res, tagPayload, pages, index) {
  callApi.callApi('tags/', 'post', tagPayload)
    .then(newTag => {
      callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { labels: 1 } }, options: {}})
        .then(updated => {
          logger.serverLog(TAG, `Updated Feature Usage ${JSON.stringify(updated)}`, 'debug')
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG, `ERROR in updating Feature Usage${JSON.stringify(err)}`, 'error')
          }
        })
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'new_tag',
          payload: {
            tag_id: newTag._id,
            tag_name: newTag.tag
          }
        }
      })
      if (index === pages.length - 1) {
        sendSuccessResponse(res, 200, newTag)
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in saving tag${JSON.stringify(err)}`)
    })
}
exports.create = function (req, res) {
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id})
    .then(planUsage => {
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          // add paid plan check later
          // if (planUsage.labels !== -1 && companyUsage.labels >= planUsage.labels) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your tags limit has reached. Please upgrade your plan to premium in order to create more tags.`
          //   })
          // }
          callApi.callApi('pages/query', 'post', {companyId: req.user.companyId, isApproved: true})
            .then(pages => {
              // console.log('pages in tags', pages)
              pages.forEach((page, i) => {
                facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': req.body.tag})
                  .then(label => {
                    if (label.body.error) {
                      if (label.body.error.code === 100) {
                        needle('get', `https://graph.facebook.com/v2.11/me/custom_labels?fields=name&access_token=${page.accessToken}`)
                          .then(Tags => {
                            let default_tag = Tags.body.data.filter(data => data.name === req.body.tag)
                            let tagPayload = {
                              tag: req.body.tag,
                              userId: req.user._id,
                              companyId: req.user.companyId,
                              pageId: page._id,
                              labelFbId: default_tag[0].id
                            }
                            createTag(req, res, tagPayload, pages, i)
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Error at find  tags from facebook ${err}`, 'error')
                          })
                      } else {
                        console.log('Not created tag page', page.pageName)
                        // sendOpAlert(label.body.error, 'tags controller in kiboengage', page._id, page.userId, page.companyId)
                        sendErrorResponse(res, 500, '', `Failed to create tag on Facebook ${JSON.stringify(label.body.error)}`)
                      }
                    } else {
                      console.log('created tag page', page.pageName)
                      let tagPayload = {
                        tag: req.body.tag,
                        userId: req.user._id,
                        companyId: req.user.companyId,
                        pageId: page._id,
                        labelFbId: label.body.id
                      }
                      createTag(req, res, tagPayload, pages, i)
                    }
                  })
                  .catch(err => {
                    sendErrorResponse(res, 500, '', `Internal Server Error in saving tag${JSON.stringify(err)}`)
                  })
              })
            })
            .catch(err => {
              sendErrorResponse(res, 500, '', `Failed to fetch connected pages ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(`Internal Server Error in fetching plan usage ${JSON.stringify(err)}`)
      }
    })
}

exports.rename = function (req, res) {
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          callApi.callApi('pages/query', 'post', {_id: tag.pageId})
            .then(pages => {
              let page = pages[0]
              facebookApiCaller('v2.11', `${tag.labelFbId}?access_token=${page.accessToken}`, 'delete', {})
                .then(label => {
                  if (label.body.error) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Failed to delete tag on Facebook ${JSON.stringify(label.body.error)}`
                    })
                  }
                })
                .catch(err => {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Failed to fetch page ${err}`
                  })
                })
              facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': req.body.newTag})
                .then(label => {
                  if (label.body.error) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Failed to create tag on Facebook ${JSON.stringify(label.body.error)}`
                    })
                  }
                  let data = {
                    tag: req.body.newTag,
                    labelFbId: label.body.id
                  }
                  async.parallelLimit([
                    function (callback) {
                      updateTag(tag, data, req, callback)
                    },
                    function (callback) {
                      callApi.callApi('tags_subscriber/query', 'post', {companyId: req.user.companyId, tagId: tag._id})
                        .then(tagSubscribers => {
                          let subscribers = tagSubscribers.map((ts) => ts.subscriberId._id)
                          if (subscribers.length > 0) {
                            assignTagToSubscribers(subscribers, req.body.newTag, req, callback, false)
                          } else {
                            callback(null, 'success')
                          }
                        })
                        .catch(err => callback(err))
                    }
                  ], 10, function (err, results) {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Failed to create tag on Facebook ${JSON.stringify(label.error)}`
                      })
                    }
                    if (i === tags.length - 1) {
                      return res.status(200).json({status: 'success', payload: 'Tag updated successfully!'})
                    }
                  })
                })
                .catch(err => {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Failed to fetch page ${err}`
                  })
                })
            })
        })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'Tag not found'
        })
      }
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

function updateTag (tag, data, req, callback) {
  callApi.callApi('tags/update', 'put', {query: {_id: tag._id}, newPayload: data, options: {}})
    .then(newTag => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'tag_rename',
          payload: {
            tag_id: tag._id,
            tag_name: tag.tag
          }
        }
      })
      callback(null, newTag)
    })
    .catch(err => {
      callback(err)
    })
}

exports.delete = function (req, res) {
  callApi.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          callApi.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id})
            .then(tagsSubscriber => {
              if (tagsSubscriber.length > 0) {
                for (let i = 0; i < tagsSubscriber.length; i++) {
                  callApi.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {})
                    .then(result => {
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to delete tag subscriber ${JSON.stringify(err)}`)
                    })
                }
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch tag subscribers ${JSON.stringify(err)}`)
            })
        })
        async.parallelLimit([
          function (callback) {
            deleteTagsFromLocal(req, tags[0], callback)
          },
          function (callback) {
            deleteTagsFromFacebook(req, tags, callback)
          }
        ], 10, function (err, results) {
          if (err) {
            return res.status(404).json({
              status: 'failed',
              description: `Failed to find tagSubscriber ${err}`
            })
          }
          res.status(200).json({status: 'success', payload: 'Tag has been deleted successfully!'})
        })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'Tag not found'
        })
      }
    })
    .catch(err => {
      return res.status(404).json({
        status: 'failed',
        description: `Failed to find tags ${err}`
      })
    })
}

function deleteTagsFromLocal (req, label, callback) {
  callApi.callApi(`tags/deleteMany`, 'post', {tag: label.tag, companyId: req.user.companyId})
    .then(tagPayload => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'tag_remove',
          payload: {
            tag_id: label._id
          }
        }
      })
      callback(null, 'success')
    })
    .catch(err => {
      callback(err)
    })
}

function deleteTagsFromFacebook (req, tags, callback) {
  tags.forEach((tag, i) => {
    callApi.callApi('pages/query', 'post', {_id: tag.pageId})
      .then(pages => {
        let page = pages[0]
        facebookApiCaller('v2.11', `${tag.labelFbId}?access_token=${page.accessToken}`, 'delete', {})
          .then(label => {
            if (label.body.error) {
              callback(label.body.error)
            }
            if (i === tags.length - 1) {
              callback(null, 'success')
            }
          })
          .catch(err => {
            callback(err)
          })
      })
      .catch(err => {
        callback(err)
      })
  })
}

function isTagExists (pageId, tags) {
  let temp = tags.map((t) => t.pageId)
  let index = temp.indexOf(pageId)
  if (index > -1) {
    return {status: true, index}
  } else {
    return {status: false}
  }
}

function assignTagToSubscribers (subscribers, tag, req, callback, flag) {
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
            .then(assignedLabel => {
              if (assignedLabel.body.error) callback(assignedLabel.body.error)
              let subscriberTagsPayload = {
                tagId: tagPayload._id,
                subscriberId: subscriber._id,
                companyId: req.user.companyId
              }
              if (flag) {
                callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                  .then(newRecord => {
                    if (i === subscribers.length - 1) {
                      callback(null, 'success')
                    }
                  })
                  .catch(err => callback(err))
              }
            })
            .catch(err => callback(err))
        } else {
          callApi.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id, companyId: req.user.companyId})
            .then(tagPayload => {
              tagPayload = tagPayload[0]
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
                .then(assignedLabel => {
                  if (assignedLabel.body.error) callback(assignedLabel.body.error)
                  let subscriberTagsPayload = {
                    tagId: tagPayload._id,
                    subscriberId: subscriber._id,
                    companyId: req.user.companyId
                  }
                  if (flag) {
                    callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                      .then(newRecord => {
                        if (i === subscribers.length - 1) {
                          callback(null, 'success')
                        }
                      })
                      .catch(err => callback(err))
                  }
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        }
      })
      .catch(err => callback(err))
  })
}

exports.assign = function (req, res) {
  let subscribers = req.body.subscribers
  let tag = req.body.tag
  async.parallelLimit([
    function (callback) {
      assignTagToSubscribers(subscribers, tag, req, callback, true)
    }
  ], 10, function (err, results) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in Assigning tag ${JSON.stringify(err)}`
      })
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_assign',
        payload: {
          tag: req.body.tag,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    return res.status(200).json({
      status: 'success',
      description: 'Tag assigned successfully'
    })
  })
}

function unassignTagFromSubscribers (subscribers, tag, req, callback) {
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?user=${subscriber.senderId}&access_token=${subscriber.pageId.accessToken}`, 'delete', {})
            .then(unassignedLabel => {
              if (unassignedLabel.body.error) callback(unassignedLabel.body.error)
              callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id})
                .then(deleteRecord => {
                  if (i === subscribers.length - 1) {
                    callback(null, 'success')
                  }
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        } else {
          callApi.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id, companyId: req.user.companyId})
            .then(tagPayload => {
              tagPayload = tagPayload[0]
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?user=${subscriber.senderId}&access_token=${subscriber.pageId.accessToken}`, 'delete', {})
                .then(unassignedLabel => {
                  if (unassignedLabel.body.error) callback(unassignedLabel.body.error)
                  callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id})
                    .then(deleteRecord => {
                      if (i === subscribers.length - 1) {
                        callback(null, 'success')
                      }
                    })
                    .catch(err => callback(err))
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        }
      })
      .catch(err => {
        callback(err)
      })
  })
}

exports.unassign = function (req, res) {
  let subscribers = req.body.subscribers
  let tag = req.body.tag
  async.parallelLimit([
    function (callback) {
      unassignTagFromSubscribers(subscribers, tag, req, callback)
    }
  ], 10, function (err, results) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in unassigning tag ${JSON.stringify(err)}`
      })
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_unassign',
        payload: {
          tag_id: req.body.tag,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    return res.status(201).json({
      status: 'success',
      description: 'Tags unassigned successfully'
    })
  })
}

exports.subscribertags = function (req, res) {
  callApi.callApi(`tags_subscriber/query`, 'post', {subscriberId: req.body.subscriberId})
    .then(tagsSubscriber => {
      let payload = []
      for (let i = 0; i < tagsSubscriber.length; i++) {
        if (!tagsSubscriber[i].tagId.defaultTag && !tagsSubscriber[i].tagId.isList) {
          payload.push({
            _id: tagsSubscriber[i].tagId._id,
            tag: tagsSubscriber[i].tagId.tag,
            subscriberId: tagsSubscriber[i].subscriberId
          })
        }
      }
      return res.status(200).json({
        status: 'success',
        payload: payload
      })
    })
    .catch(err => {
      return res.status(500)({
        status: 'failed',
        description: `Internal server error in fetching tag subscribers. ${err}`
      })
    })
}
