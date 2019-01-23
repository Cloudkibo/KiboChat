const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const logicLayer = require('./sessions.logiclayer')
const needle = require('needle')
const util = require('util')

exports.index = function (req, res) {
  let sessions = []

  const companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let messagesData = logicLayer.getQueryData('', 'aggregate', {status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
  const messagesResponse = callApi(`sessions/query`, 'post', messagesData, '', 'kibochat')

  let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
  const lastMessageResponse = callApi(`sessions/query`, 'post', lastMessageData, '', 'kibochat')

  companyUserResponse.then(companyuser => {
    let sessionsData = logicLayer.getQueryData('', 'findAll', {company_id: companyuser.companyId})
    return callApi(`sessions/query`, 'post', sessionsData, '', 'kibochat')
  })
    .then(session => {
      sessions = logicLayer.getSessions(session)
      if (sessions.length > 0) {
        return messagesResponse
      } else {
        return ''
      }
    })
    .then(gotUnreadCount => {
      if (gotUnreadCount !== '') {
        sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
        return lastMessageResponse
      } else {
        return ''
      }
    })
    .then(gotLastMessage => {
      if (gotLastMessage !== '') {
        sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
        return res.status(200).json({
          status: 'success',
          payload: sessions
        })
      } else {
        return res.status(200).json({
          status: 'success',
          payload: sessions
        })
      }
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
    })
}

exports.getNewSessions = function (req, res) {
  let criteria = {}
  let companyUser = {}

  const companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse
    .then(companyuser => {
      companyUser = companyuser
      let pageData = [
        {
          $match: {
            _id: req.body.filter && req.body.filter_criteria && req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
            companyId: companyUser.companyId,
            connected: true
          }
        }
      ]
      return callApi(`pages/query`, 'post', pageData, req.headers.authorization)
    })
    .then(pages => {
      let pageIds = pages.map((p) => p._id.toString())
      logger.serverLog(TAG, `page Ids: ${util.inspect(pageIds)}`)
      let subscriberData = []
      if (req.body.filter && req.body.filter_criteria && req.body.filter_criteria.search_value !== '') {
        subscriberData = [
          {$project: {name: {$concat: ['$firstName', ' ', '$lastName']}, companyId: 1, pageId: 1}},
          {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, name: {$regex: '.*imran.*', $options: 'i'}, isSubscribed: true}}
        ]
      } else {
        subscriberData = [
          {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, isSubscribed: true}}
        ]
      }
      return callApi(`subscribers/query`, 'post', subscriberData, req.headers.authorization)
    })
    .then(subscribers => {
      let subscriberIds = subscribers.map((s) => s._id.toString())
      logger.serverLog(TAG, `subscriber Ids: ${util.inspect(subscriberIds)}`)
      criteria = logicLayer.getNewSessionsCriteria(companyUser, req.body, subscriberIds)
      let countData = logicLayer.getQueryData('count', 'aggregate', criteria.match)
      logger.serverLog(TAG, `count Data: ${util.inspect(countData)}`)
      return callApi(`sessions/query`, 'post', countData, '', 'kibochat')
    })
    .then(sessionsCount => {
      logger.serverLog(TAG, `criteria: ${util.inspect(criteria)}`)
      logger.serverLog(TAG, `sessions count: ${util.inspect(sessionsCount)}`)
      if (sessionsCount.length > 0 && sessionsCount[0].count > 0) {
        return sessionsWithUnreadCountAndLastMessage(sessionsCount.count, req, criteria, companyUser)
      } else {
        return res.status(200).json({status: 'success', payload: {openSessions: [], count: 0}})
      }
    })
    .then(result => {
      return res.status(200).json({status: 'success', payload: {openSessions: result.sessions, count: result.count}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
    })
}

exports.getResolvedSessions = function (req, res) {
  let companyUser = {}
  let criteria = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse.then(companyuser => {
    companyUser = companyuser
    let pageData = [
      {
        $match: {
          _id: req.body.filter && req.body.filter_criteria && req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
          companyId: companyUser.companyId,
          connected: true
        }
      }
    ]
    callApi(`pages/query`, 'post', pageData, req.headers.authorization)
      .then(pages => {
        let pageIds = pages.map((p) => p._id.toString())
        let subscriberData = []
        if (req.body.filter && req.body.filter_criteria && req.body.filter_criteria.search_value !== '') {
          subscriberData = [
            {$project: {name: {$concat: ['$firstName', ' ', '$lastName']}, companyId: 1, pageId: 1}},
            {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, name: {$regex: '.*imran.*', $options: 'i'}, isSubscribed: true}}
          ]
        } else {
          subscriberData = [
            {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, isSubscribed: true}}
          ]
        }
        callApi(`subscribers/query`, 'post', subscriberData, req.headers.authorization)
          .then(subscribers => {
            let subscriberIds = subscribers.map((s) => s._id.toString())
            criteria = logicLayer.getResolvedSessionsCriteria(companyUser, req.body, subscriberIds)
            let countData = logicLayer.getQueryData('count', 'aggregate', criteria.match)
            return callApi(`sessions/query`, 'post', countData, '', 'kibochat')
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: `Failed to fetch subscriberIds ${JSON.stringify(error)}`})
          })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to fetch pageIds ${JSON.stringify(error)}`})
      })
  })
    .then(sessionsCount => {
      if (sessionsCount.length > 0 && sessionsCount[0].count > 0) {
        return sessionsWithUnreadCountAndLastMessage(sessionsCount.count, req, criteria, companyUser)
      } else {
        return res.status(200).json({status: 'success', payload: {closedSessions: [], count: 0}})
      }
    })
    .then(result => {
      return res.status(200).json({status: 'success', payload: {closedSessions: result.sessions, count: result.count}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
    })
}

exports.markread = function (req, res) {
  let session = {}
  let currentUser = {}
  let companyUser = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let sessionsData = logicLayer.getQueryData('', 'findOne', {_id: req.params.id})
  let sessionResponse = callApi('sessions/query', 'post', sessionsData, '', 'kibochat')

  let updateData = logicLayer.getUpdateData('updateAll', {session_id: req.params.id}, {status: 'seen'}, false, true)
  let readResponse = callApi('livechat', 'put', updateData, '', 'kibochat')

  companyUserResponse.then(company => {
    companyUser = company
    return sessionResponse
  })
    .then(sessionRes => {
      session = sessionRes
      return callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true}, req.headers.authorization)
    })
    .then(userPage => {
      userPage = userPage[0]
      if (userPage && userPage.userId) {
        return callApi(`user/query`, 'post', {_id: userPage.userId}, req.headers.authorization)
      }
    })
    .then(connectedUser => {
      connectedUser = connectedUser[0]
      if (req.user.facebookInfo) {
        currentUser = req.user
      } else {
        currentUser = connectedUser
      }
      return callApi(`pages/query`, 'post', {_id: session.page_id}, req.headers.authorization)
    })
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
          return readResponse
        })
    })
    .then(updated => {
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update live chat ${JSON.stringify(error)}`})
    })
}

exports.show = function (req, res) {
  let companyUser = {}
  let session = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let sessionData = logicLayer.getQueryData('', 'findOne', {_id: req.params.id})
  let sessionResponse = callApi('sessions/query', 'post', sessionData, '', 'kibochat')

  companyUserResponse.then(company => {
    companyUser = company
    return sessionResponse
  })
    .then(sessionData => {
      session = sessionData
      if (session) {
        let messagesData = logicLayer.getQueryData('', 'findAll', {session_id: session._id})
        return callApi('livechat/query', 'post', messagesData, '', 'kibochat')
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'Session with given id is not found on server.'
        })
      }
    })
    .then(chats => {
      if (session) {
        session.set('chats', JSON.parse(JSON.stringify(chats)), {strict: false})
        let messagesData = logicLayer.getQueryData('', 'aggregate', {company_id: companyUser.companyId.toString(), status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
        return callApi('livechat/query', 'post', messagesData, '', 'kibochat')
      }
    })
    .then(gotUnreadCount => {
      if (session) {
        session = logicLayer.getUnreadCountData(gotUnreadCount, session)
        let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
        return callApi(`sessions/query`, 'post', lastMessageData, '', 'kibochat')
      }
    })
    .then(gotLastMessage => {
      if (session) {
        session = logicLayer.getLastMessageData(gotLastMessage, session)
        return res.status(200).json({
          status: 'success',
          payload: session
        })
      }
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch unread couunts ${JSON.stringify(err)}`})
    })
}

exports.changeStatus = function (req, res) {
  let companyUser = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body._id}, {status: req.body.status})
  let updateSessionResponse = callApi('sessions', 'put', updateData, '', 'kibochat')

  companyUserResponse.then(company => {
    companyUser = company
    return updateSessionResponse
  })
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
}

exports.assignAgent = function (req, res) {
  let companyUser = {}
  let assignedTo = {
    type: 'agent',
    id: req.body.agentId,
    name: req.body.agentName
  }

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body.sessionId}, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
    return callApi('sessions', 'put', updateData, '', 'kibochat')
  })
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
}

exports.assignTeam = function (req, res) {
  let companyUser = {}
  let assignedTo = {
    type: 'team',
    id: req.body.teamId,
    name: req.body.teamName
  }

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body.sessionId}, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
    return callApi('sessions', 'put', updateData, '', 'kibochat')
  })
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
}

exports.unSubscribe = function (req, res) {
  let companyUser = {}
  let userPage = {}
  let subscriber = {}
  let updated = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
  let pageResponse = callApi(`pages/${req.body.page_id}`, 'get', {}, req.headers.authorization)
  let subscriberResponse = callApi(`subscribers/${req.body.subscriber_id}`, 'get', {}, req.headers.authorization)
  let updateSubscriberResponse = callApi(`subscribers/${req.body.subscriber_id}`, 'put', {isSubscribed: false, unSubscribedBy: 'agent'}, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    return pageResponse
  })
    .then(page => {
      userPage = page
      return subscriberResponse
    })
    .then(subscriberData => {
      subscriber = subscriberData
      return updateSubscriberResponse
    })
    .then(updatedData => {
      updated = updatedData
      saveNotifications(companyUser, subscriber, req)
      return callApi(`user/${userPage.userId}`, 'get', {}, req.headers.authorization)
    })
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
}

function saveNotifications (companyUser, subscriber, req) {
  let companyUserResponse = callApi(`companyUser/query`, 'post', {companyId: companyUser.companyId}, req.headers.authorization)

  companyUserResponse.then(member => {
    let notificationsData = {
      message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${req.user.name}`,
      category: {type: 'unsubscribe', id: subscriber._id},
      agentId: member.userId._id,
      companyId: subscriber.companyId
    }
    return callApi('notifications', 'post', notificationsData, '', 'kibochat')
  })
    .then(savedNotification => {})
    .catch(error => {
      logger.serverLog(TAG, `Failed to create notification ${JSON.stringify(error)}`)
    })
}

function sessionsWithUnreadCountAndLastMessage (count, req, criteria, companyUser) {
  return new Promise(function (resolve, reject) {
    let data = logicLayer.getQueryData('', 'aggregate', criteria.match, 0, criteria.sort, criteria.limit)
    let sessionsResponse = callApi('sessions/query', 'post', data, '', 'kibochat')

    sessionsResponse.then(sessions => {
      for (let i = 0; i < sessions.length; i++) {
        let subscriberId = sessions[i].subscriber_id
        let pageId = sessions[i].page_id

        callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
          .then(subscriber => {
            sessions[i].subscriber_id = subscriber
            return callApi(`pages/${pageId}`, 'get', {}, req.headers.authorization)
          })
          .then(page => {
            sessions[i].page_id = page
            if (i === sessions.length - 1) {
              sessions = logicLayer.prepareSessionsData(sessions, req.body)
              if (sessions.length > 0) {
                let messagesData = logicLayer.getQueryData('', 'aggregate', {company_id: companyUser.companyId.toString(), status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
                return callApi('livechat/query', 'post', messagesData, '', 'kibochat')
              } else {
                resolve({sessions, count})
              }
            }
          })
          .then(gotUnreadCount => {
            if (i === sessions.length - 1) {
              sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
              let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
              return callApi(`livechat/query`, 'post', lastMessageData, '', 'kibochat')
            }
          })
          .then(gotLastMessage => {
            logger.serverLog(TAG, `gotLastMessage: ${gotLastMessage}`)
            logger.serverLog(TAG, `sessions: ${sessions}`)
            if (i === sessions.length - 1) {
              sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
              resolve({sessions, count})
            }
          })
          .catch(err => {
            reject(err)
          })
      }
    })
      .catch(err => {
        reject(err)
      })
  })
}

exports.genericFind = function (req, res) {
  let messagesData = logicLayer.getQueryData('', 'findAll', req.body)
  callApi('livechat/query', 'post', messagesData, '', 'kibochat')
    .then(session => {
      return res.status(200).json({status: 'success', payload: session})
    })
    .catch(error => {
      return {status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`}
    })
}
