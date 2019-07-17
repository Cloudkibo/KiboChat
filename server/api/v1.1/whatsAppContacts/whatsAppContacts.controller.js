const logicLayer = require('./logiclayer')
const utility = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
exports.update = function (req, res) {
  let subsriberData = {
    query: {_id: req.params.id},
    newPayload: req.body,
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subsriberData)
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
