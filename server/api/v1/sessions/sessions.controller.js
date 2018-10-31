const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const dataLayer = require('./sessions.datalayer')
const logicLayer = require('./sessions.logiclayer')
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const NotificationsDataLayer = require('../notifications/notifications.datalayer')
const needle = require('needle')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyuser => {
      dataLayer.findSessionsUsingQuery({company_id: companyuser.companyId})
        .then(session => {
          let sessions = logicLayer.getSessions(session)
          if (sessions.length > 0) {
            LiveChatDataLayer.findFbMessageObjectUsingAggregate([{$match: {status: 'unseen', format: 'facebook'}}, {$sort: { datetime: 1 }}])
              .then(gotUnreadCount => {
                sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
                LiveChatDataLayer.findFbMessageObjectUsingAggregate(logicLayer.lastMessageCriteria())
                  .then(gotLastMessage => {
                    sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
                    return res.status(200).json({
                      status: 'success',
                      payload: sessions
                    })
                  })
                  .catch(err => {
                    res.status(500).json({status: 'failed', payload: `Failed to fetch last user ${JSON.stringify(err)}`})
                  })
              })
              .catch(err => {
                res.status(500).json({status: 'failed', payload: `Failed to fetch unread count ${JSON.stringify(err)}`})
              })
          } else {
            return res.status(200).json({status: 'success', payload: sessions})
          }
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(err)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.getNewSessions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      let criteria = logicLayer.getNewSessionsCriteria(companyUser, req.body)
      console.log('criteria.countCriteria', criteria.countCriteria)
      console.log('criteria.fetchCriteria', criteria.fetchCriteria)
      dataLayer.findSessionsUsingQuery(criteria.countCriteria)
        .then(sessions => {
          console.log('totalsessions', sessions)
          if (sessions.length > 0) {
            let sessionsTosend = []
            for (let i = 0; i < sessions.length; i++) {
              sessionsTosend.push({
                status: sessions[i].status,
                is_assigned: sessions[i].is_assigned,
                _id: sessions[i]._id,
                company_id: sessions[i].company_id,
                last_activity_time: sessions[i].last_activity_time,
                request_time: sessions[i].request_time,
                agent_activity_time: sessions[i].agent_activity_time
              })
              let subscriberId = sessions[i].subscriber_id
              let pageId = sessions[i].page_id
              console.log('subscriberIdForOpenSessions', subscriberId)
              console.log('pageIdForOpenSessions', pageId)
              utility.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization) // fetch subscribers of company
                .then(subscriber => {
                  console.log('fetchSubscriber', subscriber)
                  sessionsTosend[i].subscriber_id = subscriber
                  utility.callApi(`pages/${pageId}`, 'get', {}, req.headers.authorization)
                    .then(page => {
                      console.log('fetchPage', page)
                      sessionsTosend[i].page_id = page
                      console.log('sessionsTosend', sessionsTosend[i])
                      if (i === sessions.length - 1) {
                        UnreadCountAndLastMessage(sessionsTosend, req, criteria, companyUser)
                          .then(result => {
                            console.log('returned result', result)
                            return res.status(200).json({status: 'success', payload: result})
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`})
                          })
                      }
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(error)}`})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to fetch subscriber ${JSON.stringify(error)}`})
                })
            }
          } else {
            return res.status(200).json({status: 'success', payload: {openSessions: [], count: 0}})
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions count ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.getResolvedSessions = function (req, res) {
  // utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
  //   .then(companyUser => {
  //     let criteria = logicLayer.getResolvedSessionsCriteria(companyUser, req.body)
  //     dataLayer.findSessionsUsingQuery(criteria.countCriteria)
  //       .then(sessions => {
  //         let result = UnreadCountAndLastMessage(sessions, req.body, criteria, companyUser)
  //         if (result.status === 'success') {
  //           return res.status(200).json({
  //             status: 'success',
  //             payload: {closedSessions: result.payload.openSessions, count: result.payload.count}
  //           })
  //         } else {
  //           return res.status(500).json(result)
  //         }
  //       })
  //       .catch(error => {
  //         return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions count ${JSON.stringify(error)}`})
  //       })
  //   })
  //   .catch(error => {
  //     return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
  //   })
  //  return res.status(200).json({status: 'success', payload: 'result'})
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      let criteria = logicLayer.getResolvedSessionsCriteria(companyUser, req.body)
      console.log('criteria.countCriteria', criteria.countCriteria)
      console.log('criteria.fetchCriteria', criteria.fetchCriteria)
      dataLayer.findSessionsUsingQuery(criteria.countCriteria)
        .then(sessions => {
          if (sessions.length > 0) {
            console.log('totalsessions', sessions)
            let sessionsTosend = []
            for (let i = 0; i < sessions.length; i++) {
              sessionsTosend.push({
                status: sessions[i].status,
                is_assigned: sessions[i].is_assigned,
                _id: sessions[i]._id,
                company_id: sessions[i].company_id,
                last_activity_time: sessions[i].last_activity_time,
                request_time: sessions[i].request_time,
                agent_activity_time: sessions[i].agent_activity_time
              })
              let subscriberId = sessions[i].subscriber_id
              let pageId = sessions[i].page_id
              console.log('subscriberIdForOpenSessions', subscriberId)
              console.log('pageIdForOpenSessions', pageId)
              utility.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization) // fetch subscribers of company
                .then(subscriber => {
                  console.log('fetchSubscriber', subscriber)
                  sessionsTosend[i].subscriber_id = subscriber
                  utility.callApi(`pages/${pageId}`, 'get', {}, req.headers.authorization)
                    .then(page => {
                      console.log('fetchPage', page)
                      sessionsTosend[i].page_id = page
                      console.log('sessionsTosend', sessionsTosend[i])
                      if (i === sessions.length - 1) {
                        UnreadCountAndLastMessage(sessionsTosend, req, criteria, companyUser)
                          .then(result => {
                            console.log('returned result', result)
                            return res.status(200).json({status: 'success', payload: {closedSessions: result.openSessions, count: result.count}})
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`})
                          })
                      }
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(error)}`})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to fetch subscriber ${JSON.stringify(error)}`})
                })
            }
          } else {
            return res.status(200).json({status: 'success', payload: {closedSessions: [], count: 0}})
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions count ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.markread = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      dataLayer.findOneSessionUsingQuery({_id: req.params.id})
        .then(session => {
          utility.callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true}, req.headers.authorization)
            .then(userPage => {
              if (userPage[0] && userPage[0].userId) {
                utility.callApi(`user/${userPage[0].userId}`, 'get', {}, req.headers.authorization)
                  .then(connectedUser => {
                    let currentUser
                    if (req.user.facebookInfo) {
                      currentUser = req.user
                    } else {
                      currentUser = connectedUser
                    }
                    utility.callApi(`pages/query`, 'post', {_id: session.page_id}, req.headers.authorization)
                      .then(page => {
                        page = page[0]
                        needle.get(
                          `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
                          (err, resp) => {
                            if (err) {
                              logger.serverLog(TAG, `Page accesstoken from graph api Error${JSON.stringify(err)}`)
                            }
                            const data = {
                              messaging_type: 'UPDATE',
                              recipient: {id: session.subscriber_id.senderId}, // this is the subscriber id
                              sender_action: 'mark_seen'
                            }
                            if (resp && resp.body) {
                              needle.post(
                                `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,
                                data, (err, resp1) => {
                                  if (err) {
                                    logger.serverLog(TAG, err)
                                    logger.serverLog(TAG,
                                      `Error occured at subscriber :${JSON.stringify(
                                        session.subscriber_id)}`)
                                  }
                                })
                            }
                          })
                      })
                      .catch(err => {
                        res.status(500).json({status: 'failed', payload: `Failed to fetch session page ${JSON.stringify(err)}`})
                      })
                  })
                  .catch(err => {
                    res.status(500).json({status: 'failed', payload: `Failed to fetch user ${JSON.stringify(err)}`})
                  })
              }
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(err)}`})
            })
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to session ${JSON.stringify(err)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
  LiveChatDataLayer.genericUpdateFbMessageObject({session_id: req.params.id}, {status: 'seen'}, {multi: true})
    .then(updated => {
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update live chat ${JSON.stringify(error)}`})
    })
}
exports.show = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      dataLayer.findOneSessionUsingQuery({_id: req.params.id})
        .then(session => {
          if (session) {
            LiveChatDataLayer.genericFind({session_id: session._id})
              .then(chats => {
                session.set('chats', JSON.parse(JSON.stringify(chats)), {strict: false})
                LiveChatDataLayer.findFbMessageObjectUsingAggregate(logicLayer.unreadCountCriteria(companyUser))
                  .then(gotUnreadCount => {
                    session = logicLayer.getUnreadCountData(gotUnreadCount, session)
                    LiveChatDataLayer.findFbMessageObjectUsingAggregate(logicLayer.lastMessageCriteria())
                      .then(gotLastMessage => {
                        session = dataLayer.getLastMessageData(gotLastMessage, session)
                        return res.status(200).json({
                          status: 'success',
                          payload: session
                        })
                      })
                      .catch(err => {
                        res.status(500).json({status: 'failed', payload: `Failed to fetch unread couunts ${JSON.stringify(err)}`})
                      })
                  })
                  .catch(err => {
                    res.status(500).json({status: 'failed', payload: `Failed to fetch unread counts ${JSON.stringify(err)}`})
                  })
              })
              .catch(err => {
                res.status(500).json({status: 'failed', payload: `Failed to fetch chats ${JSON.stringify(err)}`})
              })
          } else {
            return res.status(404).json({
              status: 'failed',
              description: 'Session with given id is not found on server.'
            })
          }
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to session ${JSON.stringify(err)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.changeStatus = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      dataLayer.updateSessionObject(req.body._id, {status: req.body.status})
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'session_status',
              payload: {
                session_id: req.body._id,
                user_id: req.user._id,
                user_name: req.user.name,
                status: req.body.status
              }
            }
          })
          res.status(200).json({status: 'success', payload: updated})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to update session status ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.assignAgent = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      let assignedTo = {
        type: 'agent',
        id: req.body.agentId,
        name: req.body.agentName
      }
      dataLayer.updateSessionObject(req.body.sessionId, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'session_assign',
              payload: {
                session_id: req.body.sessionId,
                user_id: req.user._id,
                user_name: req.user.name,
                assigned_to: assignedTo
              }
            }
          })
          res.status(200).json({status: 'success', payload: updated})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to update session ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.assignTeam = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      let assignedTo = {
        type: 'team',
        id: req.body.teamId,
        name: req.body.teamName
      }
      dataLayer.updateSessionObject(req.body.sessionId, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'session_assign',
              payload: {
                session_id: req.body.sessionId,
                user_id: req.user._id,
                user_name: req.user.name,
                assigned_to: assignedTo
              }
            }
          })
          res.status(200).json({status: 'success', payload: updated})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to update session ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.unSubscribe = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`pages/${req.body.page_id}`, 'get', {}, req.headers.authorization)
        .then(userPage => {
          userPage = userPage[0]
          utility.callApi(`subscribers/${req.body.subscriber_id}`, 'get', {}, req.headers.authorization)
            .then(subscriber => {
              subscriber = subscriber[0]
              utility.callApi(`subscribers/${req.body.subscriber_id}`, 'put', {isSubscribed: false, unSubscribedBy: 'agent'}, req.headers.authorization)
                .then(updated => {
                  saveNotifications(companyUser, subscriber, req)
                  utility.callApi(`user/${userPage.userId}`, 'get', {}, req.headers.authorization)
                    .then(connectedUser => {
                      var currentUser
                      if (req.user.facebookInfo) {
                        currentUser = req.user
                      } else {
                        currentUser = connectedUser
                      }
                      needle.get(
                        `https://graph.facebook.com/v2.10/${userPage.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
                        (err, resp) => {
                          if (err) {
                            logger.serverLog(TAG,
                              `Page access token from graph api error ${JSON.stringify(err)}`)
                          }
                          const messageData = {
                            text: 'We have unsubscribed you from our page. We will notify you when we subscribe you again. Thanks'
                          }
                          const data = {
                            messaging_type: 'UPDATE',
                            recipient: {id: subscriber.senderId}, // this is the subscriber id
                            message: messageData
                          }
                          needle.post(
                            `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,
                            data, (err, resp) => {
                              if (err) {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: JSON.stringify(err)
                                })
                              }
                              require('./../../../config/socketio').sendMessageToClient({
                                room_id: companyUser.companyId,
                                body: {
                                  action: 'unsubscribe',
                                  payload: {
                                    subscriber_id: req.body.subscriber_id,
                                    user_id: req.user._id,
                                    user_name: req.user.name
                                  }
                                }
                              })
                              res.status(200).json({status: 'success', payload: updated})
                            })
                        })
                    })
                    .catch(err => {
                      res.status(500).json({status: 'failed', payload: `Failed to fetch user ${JSON.stringify(err)}`})
                    })
                })
                .catch(err => {
                  res.status(500).json({status: 'failed', payload: `Failed to update subscriber ${JSON.stringify(err)}`})
                })
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: `Failed to fetch subscriber ${JSON.stringify(err)}`})
            })
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(err)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
function saveNotifications (companyUser, subscriber, req) {
  // utility.callApi(`companyUser/query`, 'post', {companyId: companyUser.companyId}, req.headers.authorization)
  //   .then(member => {
  //     NotificationsDataLayer.createNotificationObject({
  //       message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${user.name}`,
  //       category: {type: 'unsubscribe', id: subscriber._id},
  //       agentId: member.userId._id,
  //       companyId: subscriber.companyId
  //     })
  //       .then(savedNotification => {})
  //       .catch(error => {
  //         logger.serverLog(TAG, `Failed to create notification ${JSON.stringify(error)}`)
  //       })
  //   })
  //   .catch(error => {
  //     logger.serverLog(TAG,
  //       `Failed to fetch company members ${JSON.stringify(error)}`)
  //   })
}
function UnreadCountAndLastMessage (sessions, req, criteria, companyUser) {
  return new Promise(function (resolve, reject) {
    let sessionsTosend = []
    console.log('UnreadCountAndLastMessage', sessions)
    let sessionsData = logicLayer.prepareSessionsData(sessions, req.body)
    dataLayer.aggregate(criteria.fetchCriteria)
      .then(sessionss => {
        if (sessionss.length > 0) {
          for (let i = 0; i < sessionss.length; i++) {
            sessionsTosend.push({
              status: sessionss[i].status,
              is_assigned: sessionss[i].is_assigned,
              _id: sessionss[i]._id,
              company_id: sessionss[i].company_id,
              last_activity_time: sessionss[i].last_activity_time,
              request_time: sessionss[i].request_time,
              agent_activity_time: sessionss[i].agent_activity_time
            })
            let subscriberId = sessionss[i].subscriber_id
            let pageId = sessionss[i].page_id
            console.log('subscriberIdForOpenSessions', subscriberId)
            console.log('pageIdForOpenSessions', pageId)
            utility.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization) // fetch subscribers of company
              .then(subscriber => {
                console.log('fetchSubscriber', subscriber)
                sessionsTosend[i].subscriber_id = subscriber
                utility.callApi(`pages/${pageId}`, 'get', {}, req.headers.authorization)
                  .then(page => {
                    console.log('fetchPage', page)
                    sessionsTosend[i].page_id = page
                    console.log('sessions aggregate', sessionss)
                    if (i === sessionss.length - 1) {
                      let sessions = logicLayer.prepareSessionsData(sessionsTosend, req.body)
                      if (sessions.length > 0) {
                        LiveChatDataLayer.findFbMessageObjectUsingAggregate(logicLayer.unreadCountCriteria(companyUser))
                          .then(gotUnreadCount => {
                            console.log('gotUnreadCount', gotUnreadCount)
                            sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
                            console.log('sessions after gotUnreadCOunt', sessions)
                            LiveChatDataLayer.findFbMessageObjectUsingAggregate(logicLayer.lastMessageCriteria())
                              .then(gotLastMessage => {
                                console.log('gotLastMessage', gotLastMessage)
                                sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
                                console.log('gotLastMessage sessions', sessions)
                                resolve({openSessions: sessions, count: sessionsData.length})
                              })
                              .catch(err => {
                                reject(err)
                              })
                          })
                          .catch(err => {
                            reject(err)
                          })
                      } else {
                        resolve({openSessions: sessions, count: sessionsData.length})
                      }
                    }
                  })
                  .catch(err => {
                    reject(err)
                  })
              })
              .catch(err => {
                reject(err)
              })
          }
        } else {
          resolve({openSessions: [], count: sessionsData.length})
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}
exports.genericFind = function (req, res) {
  console.log('in genericFind', req.body)
  dataLayer.findSessionsUsingQuery(req.body)
    .then(session => {
      return res.status(200).json({status: 'success', payload: session})
    })
    .catch(error => {
      return {status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`}
    })
}
