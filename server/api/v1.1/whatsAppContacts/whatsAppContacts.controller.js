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
          action: 'unsubscribe_whatsapp',
          payload: {
            contactId: req.params.id,
            user_id: req.user._id,
            user_name: req.user.name
          }
        }
      })
      sendSuccessResponse(res, 200, updated)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to update contact ${JSON.stringify(err)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      console.log('companyUser', companyuser)
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
                sendErrorResponse(res, 500, `Failed to create new contact ${JSON.stringify(error)}`)
              })
          } else {
            sendSuccessResponse(res, 200, contacts[0])
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch whatsapp contact ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
