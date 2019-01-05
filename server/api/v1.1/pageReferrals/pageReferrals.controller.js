const utility = require('../utility')
const logicLayer = require('./pageReferrals.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`pageReferrals/query`, 'post', {companyId: '5c08c5e20464fb0fbc037a5d'}, req.headers.authorization)
        .then(pageReferrals => {
          return res.status(200).json({status: 'success', payload: pageReferrals})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pageReferrals ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.view = function (req, res) {
  utility.callApi(`pageReferrals/query`, 'post', {_id: req.params.id}, req.headers.authorization)
    .then(pageReferrals => {
      return res.status(200).json({status: 'success', payload: pageReferrals[0]})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch pageReferral ${JSON.stringify(error)}`})
    })
}
exports.delete = function (req, res) {
  utility.callApi(`pageReferrals/${req.params.id}`, 'delete', {}, req.headers.authorization)
    .then(result => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to delete pageReferral ${JSON.stringify(error)}`})
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`pageReferrals/query`, 'post', {pageId: req.body.pageId}, req.headers.authorization)
        .then(pageReferrals => {
          if (pageReferrals && pageReferrals.length > 0) {
            isUnique(pageReferrals, req.body.ref_parameter)
              .then(result => {
                if (!result.isUnique) {
                  return res.status(500).json({status: 'failed', payload: 'Please choose a unique Ref Parameter'})
                } else {
                  utility.callApi(`pageReferrals`, 'post', logicLayer.createPayload('companyUser', req.body), req.headers.authorization)
                    .then(craetedPageReferral => {
                      return res.status(200).json({status: 'success', payload: craetedPageReferral})
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to create pageReferral ${JSON.stringify(error)}`})
                    })
                }
              })
          } else {
            utility.callApi(`pageReferrals`, 'post', logicLayer.createPayload(companyUser, req.body), req.headers.authorization)
              .then(craetedPageReferral => {
                return res.status(200).json({status: 'success', payload: craetedPageReferral})
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to create pageReferral ${JSON.stringify(error)}`})
              })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pageReferrals ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.update = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`pageReferrals/query`, 'post', {_id: req.body._id}, req.headers.authorization)
        .then(pageReferrals => {
          if (pageReferrals.length > 0 && req.body.ref_parameter) {
            isUniqueEdit(pageReferrals, req.body.ref_parameter)
              .then(result => {
                if (!result.isUnique) {
                  return res.status(500).json({status: 'failed', payload: 'Please choose a unique Ref Parameter'})
                } else {
                  utility.callApi(`pageReferrals/${req.body._id}`, 'put', req.body, req.headers.authorization)
                    .then(updatedPageReferral => {
                      return res.status(200).json({status: 'success', payload: updatedPageReferral})
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to update pageReferral ${JSON.stringify(error)}`})
                    })
                }
              })
          } else {
            utility.callApi(`pageReferrals/${req.body._id}`, 'put', req.body, req.headers.authorization)
              .then(updatedPageReferral => {
                return res.status(200).json({status: 'success', payload: updatedPageReferral})
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to update pageReferral ${JSON.stringify(error)}`})
              })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pageReferrals ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
function isUnique (pageReferrals, refParameter) {
  let isUnique = true
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < pageReferrals.length; i++) {
      if (pageReferrals[i].ref_parameter === refParameter) {
        isUnique = false
      }
      if (i === pageReferrals.length - 1) {
        resolve({isUnique: isUnique})
      }
    }
  })
}
function isUniqueEdit (pageReferrals, body) {
  let isUnique = true
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < pageReferrals.length; i++) {
      if (pageReferrals[i].ref_parameter === body.ref_parameter && pageReferrals[i].pageId !== body.pageId) {
        isUnique = false
      }
      if (i === pageReferrals.length - 1) {
        resolve({isUnique: isUnique})
      }
    }
  })
}
