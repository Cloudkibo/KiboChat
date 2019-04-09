/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/tags/tags.controller.js'
const callApi = require('../utility')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('tags/query', 'post', {companyId: companyUser.companyId, defaultTag: false, isList: false}, req.headers.authorization)
        .then(tags => {
          res.status(200).json({status: 'success', payload: tags})
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

exports.create = function (req, res) {
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId}, req.headers.authorization)
        .then(companyUsage => {
          // add paid plan check later
          // if (planUsage.labels !== -1 && companyUsage.labels >= planUsage.labels) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your tags limit has reached. Please upgrade your plan to premium in order to create more tags.`
          //   })
          // }
          callApi.callApi('pages/query', 'post', {companyId: req.user.companyId}, req.headers.authorization)
            .then(pages => {
              pages.forEach((page, i) => {
                facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': req.body.tag})
                  .then(label => {
                    if (label.body.error) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Failed to create tag on Facebook ${JSON.stringify(label.body.error)}`
                      })
                    }
                    let tagPayload = {
                      tag: req.body.tag,
                      userId: req.user._id,
                      companyId: req.user.companyId,
                      pageId: page._id,
                      labelFbId: label.body.id
                    }
                    callApi.callApi('tags/', 'post', tagPayload, req.headers.authorization)
                      .then(newTag => {
                        callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { labels: 1 } }, options: {}}, req.headers.authorization)
                          .then(updated => {
                            logger.serverLog(TAG, `Updated Feature Usage ${JSON.stringify(updated)}`)
                          })
                          .catch(err => {
                            if (err) {
                              logger.serverLog(TAG, `ERROR in updating Feature Usage${JSON.stringify(err)}`)
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
                        if (i === pages.length - 1) {
                          return res.status(201).json({status: 'success', payload: newTag})
                        }
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Internal Server Error in saving tag${JSON.stringify(err)}`
                        })
                      })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error in saving tag${JSON.stringify(err)}`
                    })
                  })
              })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to fetch connected pages ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error in fetching plan usage{JSON.stringify(err)}`
        })
      }
    })
}

exports.rename = function (req, res) {
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag}, req.headers.authorization)
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          callApi.callApi('pages/query', 'post', {_id: tag.pageId}, req.headers.authorization)
            .then(pages => {
              let page = pages[0]
              facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'label': req.body.newTag})
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
                      callApi.callApi('tags_subscriber/query', 'post', {companyId: req.user.companyId, tag: req.body.tag}, req.headers.authorization)
                        .then(tagSubscribers => {
                          let subscribers = tagSubscribers.map((ts) => ts.subscriberId._id)
                          assignTagToSubscribers(subscribers, req.body.tag, req, callback)
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
  callApi.callApi('tags/update', 'put', {query: {_id: tag._id}, newPayload: data, options: {}}, req.headers.authorization)
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
  callApi.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: req.body.tag}, req.headers.authorization)
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          callApi.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id}, req.headers.authorization)
            .then(tagsSubscriber => {
              for (let i = 0; i < tagsSubscriber.length; i++) {
                callApi.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {}, req.headers.authorization)
                  .then(result => {
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to delete tag subscriber ${JSON.stringify(err)}`)
                  })
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
  callApi.callApi(`tags/deleteMany`, 'post', {tag: label.tag, companyId: req.user.companyId}, req.headers.authorization)
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
    callApi.callApi('pages/query', 'post', {_id: tag.pageId}, req.headers.authorization)
      .then(pages => {
        let page = pages[0]
        facebookApiCaller('v2.11', `me/${tag.labelFbId}?access_token=${page.accessToken}`, 'delete', {})
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

function assignTagToSubscribers (subscribers, tag, req, callback) {
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
            .then(assignedLabel => {
              if (assignedLabel.body.error) callback(assignedLabel.body.error)
              let subscriberTagsPayload = {
                tagId: tagPayload._id,
                subscriberId: subscriber._id,
                companyId: req.user.companyId
              }
              callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload, req.headers.authorization)
                .then(newRecord => {
                  if (i === subscribers.length - 1) {
                    callback(null, 'success')
                  }
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        } else {
          callApi.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id}, req.headers.authorization)
            .then(tagPayload => {
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
                .then(assignedLabel => {
                  if (assignedLabel.body.error) callback(assignedLabel.body.error)
                  let subscriberTagsPayload = {
                    tagId: tagPayload._id,
                    subscriberId: subscriber._id,
                    companyId: req.user.companyId
                  }
                  callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload, req.headers.authorization)
                    .then(newRecord => {
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
      .catch(err => callback(err))
  })
}

exports.assign = function (req, res) {
  let subscribers = req.body.subscribers
  let tag = req.body.tag
  async.parallelLimit([
    function (callback) {
      assignTagToSubscribers(subscribers, tag, req, callback)
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
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?user=${subscriber.senderId}&access_token=${subscriber.pageId.accessToken}`, 'delete', {})
            .then(unassignedLabel => {
              if (unassignedLabel.body.error) callback(unassignedLabel.body.error)
              callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id}, req.headers.authorization)
                .then(deleteRecord => {
                  if (i === subscribers.length - 1) {
                    callback(null, 'success')
                  }
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        } else {
          callApi.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id}, req.headers.authorization)
            .then(tagPayload => {
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?user=${subscriber.senderId}&access_token=${subscriber.pageId.accessToken}`, 'delete', {})
                .then(unassignedLabel => {
                  if (unassignedLabel.body.error) callback(unassignedLabel.body.error)
                  callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id}, req.headers.authorization)
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
      .catch(err => callback(err))
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
  callApi.callApi(`tags_subscriber/query`, 'post', {subscriberId: req.body.subscriberId}, req.headers.authorization)
    .then(tagsSubscriber => {
      let payload = []
      for (let i = 0; i < tagsSubscriber.length; i++) {
        payload.push({
          _id: tagsSubscriber[i].tagId._id,
          tag: tagsSubscriber[i].tagId.tag,
          subscriberId: tagsSubscriber[i].subscriberId
        })
      }
      res.status(200).json({
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
