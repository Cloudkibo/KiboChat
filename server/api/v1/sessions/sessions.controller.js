const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const dataLayer = require('./sessions.datalayer')
const logicLayer = require('./sessions.logiclayer')
const LiveChatDataLayer = require('../livechat/livechat.datalayer')
const LiveChatLogicLayer = require('../livechat/livechat.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/${req.user.domain_email}`) // fetch company user
    .then(companyuser => {
      dataLayer.findSessionsUsingQuery({company_id: companyuser.companyId})
        .then(session => {
          let sessions = logicLayer.getSessions(session)
          if (sessions.length > 0) {
            LiveChatDataLayer.aggregate([{$match: {status: 'unseen', format: 'facebook'}}, {$sort: { datetime: 1 }}])
              .then(gotUnreadCount => {
                sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
                LiveChatDataLayer.aggregate([
                  {$sort: { datetime: 1 }},
                  {$group: {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }}}])
                  .then(gotLastMessage => {
                    sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
                    return res.status(200).json({
                      status: 'success',
                      payload: sessions
                    })
                  })
                  .catch(err => {
                    res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(err)}`})
                  })
              })
              .catch(err => {
                res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(err)}`})
              })
          } else {
            return res.status(200).json({
              status: 'success',
              payload: sessions
            })
          }
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(err)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
