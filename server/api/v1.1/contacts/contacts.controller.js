const csv = require('csv-parser')
const phoneNumberLogicLayer = require('../../v1/phoneNumber/phoneNumber.logiclayer')
const logicLayer = require('./logiclayer')
const utility = require('../utility')
const fs = require('fs')
const logger = require('../../../components/logger')
const TAG = 'api/contacts/contacts.controller.js'
const path = require('path')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
        if (err) {
          sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
        }
        let phoneColumn = req.body.phoneColumn
        let nameColumn = req.body.nameColumn
        fs.createReadStream(directory.dir + '/userfiles/' + directory.serverPath)
          .pipe(csv())
          .on('data', function (data) {
            if (data[`${phoneColumn}`] && data[`${nameColumn}`]) {
              var result = data[`${phoneColumn}`].replace(/[- )(]+_/g, '')
              utility.callApi(`contacts/query`, 'post', {
                number: result, companyId: companyUser.companyId})
                .then(phone => {
                  if (phone.length === 0) {
                    let payload = logicLayer.preparePayload(req.body, companyUser, data, nameColumn, result)
                    utility.callApi(`contacts`, 'post', payload)
                      .then(saved => {
                      })
                      .catch(error => {
                        logger.serverLog(TAG, `Failed to save contact ${JSON.stringify(error)}`, 'error')
                      })
                  }
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to fetch contacts ${JSON.stringify(error)}`, 'error')
                })
            }
          })
          .on('end', function () {
            fs.unlinkSync(directory.dir + '/userfiles/' + directory.serverPath)
            sendSuccessResponse(res, 200, 'Contacts saved successfully')
          })
      })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
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
                  logger.serverLog(TAG, `Failed to save contact ${JSON.stringify(error)}`, 'error')
                })
            }
            if (i === req.body.numbers.length - 1) {
              sendSuccessResponse(res, 200, 'Contacts saved successfully')
            }
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
          })
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
