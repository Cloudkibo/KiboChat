const logicLayer = require('./logiclayer')
const utility = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const path = require('path')
const fs = require('fs')
const async = require('async')
const csv = require('csv-parser')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/whatsAppContacts/whatsAppContacts.controller.js'
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
        .then(count => {
          utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
            .then(contacts => {
              sendSuccessResponse(res, 200, {contacts: contacts, count: count.length > 0 ? count[0].count : 0})
            })
            .catch(error => {
              const message = error || 'Failed to fetch subscribers'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, { user: req.user, criterias }, 'error')
              sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscriber count'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, { user: req.user, criterias }, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.update = function (req, res) {
  let subsriberData = {
    query: {_id: req.params.id},
    newPayload: req.body,
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subsriberData)
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'Whatsapp_subscriberName_update',
          payload: {
            subscriberId: req.params.id,
            name: req.body.name
          }
        }
      })
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, { user: req.user, params: req.params }, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.unSubscribe = function (req, res) {
  let subsriberData = {
    query: {_id: req.params.id},
    newPayload: {isSubscribed: false, unSubscribedBy: 'agent'},
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subsriberData)
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'Whatsapp_unsubscribe_subscriber',
          payload: {
            subscriber_id: req.params.id,
            user_id: req.user._id,
            user_name: req.user.name
          }
        }
      })
      sendSuccessResponse(res, 200, updated)
    })
    .catch(err => {
      const message = err || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.unSubscribe`, {}, { user: req.user, params: req.params }, 'error')
      sendErrorResponse(res, 500, `Failed to update contact ${JSON.stringify(err)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`whatsAppContacts/query`, 'post', {companyId: companyuser.companyId, number: req.body.number}) // check if number exists
        .then(contacts => {
          if (contacts.length === 0) {
            utility.callApi(`whatsAppContacts`, 'post', {companyId: companyuser.companyId, name: req.body.number, number: req.body.number}) // fetch subscribers
              .then(newContact => {
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: req.user.companyId,
                  body: {
                    action: 'new_session_created_whatsapp',
                    payload: newContact
                  }
                })
                sendSuccessResponse(res, 200, newContact)
              })
              .catch(error => {
                const message = error || 'Failed to create new contact'
                logger.serverLog(message, `${TAG}: exports.create`, req.body, { user: req.user, params: req.params }, 'error')
                sendErrorResponse(res, 500, `Failed to create new contact ${JSON.stringify(error)}`)
              })
          } else {
            sendSuccessResponse(res, 200, contacts[0])
          }
        })
        .catch(error => {
          const message = error || 'Failed to fetch whatsapp contact'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, { user: req.user, params: req.params }, 'error')
          sendErrorResponse(res, 500, `Failed to fetch whatsapp contact ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, { user: req.user, params: req.params }, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.getDuplicateSubscribers = function (req, res) {
  let directory = logicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      const message = err || 'Failed to move file'
      logger.serverLog(message, `${TAG}: exports.getDuplicateSubscribers`, req.body, { user: req.user, files: req.files }, 'error')
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      directory: directory
    }
    _getDuplicateRecords(data)
      .then(result => {
        sendSuccessResponse(res, 200, result)
      })
      .catch(err => {
        const message = err || 'Failed to get duplicate records'
        logger.serverLog(message, `${TAG}: exports.getDuplicateSubscribers`, req.body, { user: req.user, files: req.files }, 'error')
        sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
      })
  })
}
const _getDuplicateRecords = (data) => {
  return new Promise(function (resolve, reject) {
    let phoneColumn = data.body.phoneColumn
    let nameColumn = data.body.nameColumn
    let numbers = []
    fs.createReadStream(data.directory.dir + '/userfiles/' + data.directory.serverPath)
      .pipe(csv())
      .on('data', function (fileData) {
        if (fileData[`${phoneColumn}`] && fileData[`${nameColumn}`]) {
          var result = fileData[`${phoneColumn}`].replace(/[- )(]+_/g, '')
          numbers.push(result)
        }
      })
      .on('end', function () {
        fs.unlinkSync(data.directory.dir + '/userfiles/' + data.directory.serverPath)
        let query = [
          {$match: {number: {$in: numbers}, companyId: data.companyId}},
          {$group: {_id: null, count: {$sum: 1}}}
        ]
        utility.callApi(`whatsAppContacts/aggregate`, 'post', query)
          .then(results => {
            resolve(results.length > 0 ? results[0].count : 0)
          })
          .catch(error => {
            reject(error)
          })
      })
  })
}
exports.sendMessage = function (req, res) {
  let payload = JSON.parse(req.body.payload)
  let directory = logicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      const message = err || 'Failed to send message'
      logger.serverLog(message, `${TAG}: exports.sendMessage`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      user: req.user,
      directory: directory,
      payload: payload,
      whatsApp: req.user.whatsApp
    }
    async.series([
      _parseFile.bind(null, data),
      _fetchSubscribers.bind(null, data),
      _sendTemplateMessage.bind(null, data)
    ], function (err) {
      if (err) {
        let severity = 'error'
        let message = err || 'Failed to send invitation template'
        if (err.code === 20003) {
          severity = 'info'
          message = 'Permission Denied from Twilio. You lack permission to the resource and method you requested.'
        }
        logger.serverLog(message, `${TAG}: exports.sendMessage`, req.body, { user: req.user }, severity)
        sendErrorResponse(res, 500, err, message)
      } else {
        sendSuccessResponse(res, 200, 'Message Sent Successfully')
      }
    })
  })
}

const _parseFile = (data, next) => {
  let phoneColumn = data.body.phoneColumn
  let nameColumn = data.body.nameColumn
  let contacts = []
  fs.createReadStream(data.directory.dir + '/userfiles/' + data.directory.serverPath)
    .pipe(csv())
    .on('data', function (fileData) {
      if (fileData[`${phoneColumn}`] && fileData[`${nameColumn}`]) {
        var result = fileData[`${phoneColumn}`].replace(/[- )(]+_/g, '')
        contacts.push({name: fileData[`${nameColumn}`], number: result})
      }
    })
    .on('end', function () {
      fs.unlinkSync(data.directory.dir + '/userfiles/' + data.directory.serverPath)
      data.contacts = contacts
      next(null, data)
    })
}
const _sendTemplateMessage = (data, next) => {
  if (data.numbers.length > 0) {
    whatsAppMapper(data.whatsApp.provider, ActionTypes.SEND_INVITATION_TEMPLATE, data)
      .then(response => {
        next(null, data)
      })
      .catch(error => {
        next(error)
      })
  } else {
    next(null, data)
  }
}
const _fetchSubscribers = (data, next) => {
  let numbers = []
  data.contacts.forEach((contact, index) => {
    utility.callApi(`whatsAppContacts/query`, 'post', {companyId: data.companyId, number: contact.number})
      .then(whatsAppContact => {
        whatsAppContact = whatsAppContact[0]
        if (!whatsAppContact) {
          numbers.push(contact.number)
          _saveSubscriber(data, contact)
        } else if (data.body.actionType === 'send') {
          numbers.push(contact.number)
          _saveChat(data, whatsAppContact)
          _updateSubscriber(whatsAppContact)
        }
        if (index === data.contacts.length - 1) {
          data.numbers = numbers
          next(null, data)
        }
      })
      .catch((err) => {
        next(err)
      })
  })
}

const _saveSubscriber = (data, contact) => {
  utility.callApi(`whatsAppContacts`, 'post', {
    name: contact.name,
    number: contact.number,
    companyId: data.companyId})
    .then(whatsAppContact => {
      _saveChat(data, whatsAppContact)
      _updateSubscriber(whatsAppContact)
    })
    .catch((err) => {
      const message = err || 'Failed to create subscriber'
      logger.serverLog(message, `${TAG}: exports._saveSubscriber`, {}, { data, contact }, 'error')
    })
}

const _saveChat = (data, contact) => {
  let MessageObject = logicLayer.prepareChat(data, contact)
  utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
    .then(message => {
    })
    .catch((err) => {
      const message = err || 'Failed to save chat'
      logger.serverLog(message, `${TAG}: exports._saveChat`, {}, { data, contact, MessageObject }, 'error')
    })
}

const _updateSubscriber = (contact) => {
  let subscriberData = {
    query: {_id: contact._id},
    newPayload: {
      $set: {last_activity_time: Date.now()},
      $inc: { messagesCount: 1 }
    },
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subscriberData)
    .then(updated => {
    }).catch((err) => {
      const message = err || 'Failed to update subscriber'
      logger.serverLog(message, `${TAG}: exports._updateSubscriber`, {}, { contact, subscriberData }, 'error')
    })
}
