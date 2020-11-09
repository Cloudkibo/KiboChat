const csv = require('csv-parser')
const phoneNumberLogicLayer = require('../../v1/phoneNumber/phoneNumber.logiclayer')
const contactListsDataLayer = require('./contactLists.datalayer')
const logicLayer = require('./logiclayer')
const utility = require('../utility')
const fs = require('fs')
const logger = require('../../../components/logger')
const TAG = 'api/contacts/contacts.controller.js'
const path = require('path')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const async = require('async')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`contacts/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
        .then(count => {
          utility.callApi(`contacts/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
            .then(contacts => {
              sendSuccessResponse(res, 200, {contacts: contacts, count: count.length > 0 ? count[0].count : 0})
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.uploadFile = function (req, res) {
  let directory = phoneNumberLogicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      directory: directory
    }
    async.series([
      _getListId.bind(null, data),
      _saveContacts.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Failed to create autoposting'
        logger.serverLog(message, `${TAG}: exports.uploadFile`, {}, {}, 'error')
        sendErrorResponse(res, 500, '', err)
      } else {
        sendSuccessResponse(res, 200, 'Contacts saved successfully')
      }
    })
  })
}
const _getListId = (data, next) => {
  if (data.body.newListName) {
    contactListsDataLayer.create({name: data.body.newListName, companyId: data.companyId})
      .then(createdList => {
        data.body.listId = createdList._id
        next(null, data)
      })
      .catch(err => {
        next(err)
      })
  } else {
    next(null, data)
  }
}

const _saveContacts = (data, next) => {
  let phoneColumn = data.body.phoneColumn
  let nameColumn = data.body.nameColumn
  fs.createReadStream(data.directory.dir + '/userfiles/' + data.directory.serverPath)
    .pipe(csv())
    .on('data', function (fileData) {
      if (fileData[`${phoneColumn}`] && fileData[`${nameColumn}`]) {
        var result = fileData[`${phoneColumn}`].replace(/[- )(]+_/g, '')
        utility.callApi(`contacts/query`, 'post', {
          number: result, companyId: data.companyId})
          .then(phone => {
            if (phone.length === 0) {
              let payload = logicLayer.preparePayload(data.body, data.companyId, fileData, nameColumn, result)
              utility.callApi(`contacts`, 'post', payload)
                .then(saved => {
                })
                .catch(error => {
                  const message = err || 'Failed to save contact'
                  return logger.serverLog(message, `${TAG}: exports._saveContacts`, {}, {}, 'error')
                })
            } else if (data.body.listId !== 'master') {
              phone = phone[0]
              let index = -1
              if (phone.listIds && phone.listIds.length > 0) {
                index = phone.listIds.indexOf(data.body.listId)
              }
              if (index === -1) {
                let subsriberData = {
                  query: {_id: phone._id},
                  newPayload: { $push: { listIds: data.body.listId } },
                  options: {}
                }
                utility.callApi(`contacts/update`, 'put', subsriberData)
                  .then(updated => {
                  })
                  .catch(error => {
                    const message = err || 'failed to update contact'
                    return logger.serverLog(message, `${TAG}: exports._saveContacts`, {}, {}, 'error')
                  })
              }
            }
          })
          .catch(error => {
            const message = err || 'failed to fetch contact'
            return logger.serverLog(message, `${TAG}: exports._saveContacts`, {}, {}, 'error')
          })
      }
    })
    .on('end', function () {
      fs.unlinkSync(data.directory.dir + '/userfiles/' + data.directory.serverPath)
      next(null, data)
    })
}
exports.uploadNumbers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      for (let i = 0; i < req.body.numbers.length; i++) {
        utility.callApi(`contacts/query`, 'post', {
          number: req.body.numbers[i].number, companyId: companyUser.companyId})
          .then(phone => {
            if (phone.length === 0) {
              utility.callApi(`contacts`, 'post', {
                name: req.body.numbers[i].name,
                number: req.body.numbers[i].number,
                companyId: companyUser.companyId})
                .then(saved => {
                })
                .catch(error => {
                  const message = err || 'Failed to save contact'
                  return logger.serverLog(message, `${TAG}: exports.uploadNumbers`, {}, {}, 'error')
                })
            }
            if (i === req.body.numbers.length - 1) {
              sendSuccessResponse(res, 200, 'Contacts saved successfully')
            }
          })
          .catch(error => {
            const message = error || 'Failed to fetch contact'
            return logger.serverLog(message, `${TAG}: exports.uploadNumbers`, {}, {}, 'error')
          })
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.update = function (req, res) {
  let subsriberData = {
    query: {_id: req.params.id},
    newPayload: req.body,
    options: {}
  }
  utility.callApi(`contacts/update`, 'put', subsriberData)
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.fetchLists = function (req, res) {
  contactListsDataLayer.findAllLists({companyId: req.user.companyId})
    .then(lists => {
      sendSuccessResponse(res, 200, lists)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
