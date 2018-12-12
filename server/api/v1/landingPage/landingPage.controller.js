const utility = require('../utility')
const logicLayer = require('./landingPage.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`landingPage/query`, 'post', {companyId: companyUser.companyId}, req.headers.authorization)
        .then(landingPages => {
          return res.status(200).json({status: 'success', payload: landingPages})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch landingPages ${JSON.stringify(error)}`})
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
  let updatedLandingPage = logicLayer.prepareUpdatePayload(req.body)
  utility.callApi(`landingPage/${req.params.id}`, 'put', updatedLandingPage, req.headers.authorization)
    .then(updatedLandingPage => {
      if (req.body.submittedState && req.body.submittedState.state) {
        utility.callApi(`landingPage/landingPageState/${req.body.submittedState.state._id}`, 'put', req.body.submittedState.state, req.headers.authorization)
          .then(landingPage => {
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
          })
      }
      utility.callApi(`landingPage/landingPageState/${req.body.initialState._id}`, 'put', req.body.initialState, req.headers.authorization)
        .then(landingPage => {
          return res.status(201).json({status: 'success', payload: landingPage})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${JSON.stringify(error)}`})
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
      utility.callApi(`landingPage/landingPageState`, 'post', req.body.initialState, req.headers.authorization)
        .then(landingPageState => {
          if (req.body.submittedState && req.body.submittedState.state) {
            console.log()
            utility.callApi(`landingPage/landingPageState`, 'post', req.body.submittedState.state, req.headers.authorization)
              .then(landingPageSubmittedState => {
                let payload = logicLayer.preparePayload(req.body, landingPageState, companyUser, landingPageSubmittedState)
                utility.callApi(`landingPage`, 'post', payload, req.headers.authorization)
                  .then(landingPage => {
                    return res.status(201).json({status: 'success', payload: landingPage})
                  })
                  .catch(error => {
                    return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
                  })
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${JSON.stringify(error)}`})
              })
          } else {
            let payload = logicLayer.preparePayload(req.body, landingPageState, companyUser)
            utility.callApi(`landingPage`, 'post', payload, req.headers.authorization)
              .then(landingPage => {
                return res.status(201).json({status: 'success', payload: landingPage})
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
              })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.delete = function (req, res) {
  utility.callApi(`landingPage/query`, 'post', {_id: req.params.id}, req.headers.authorization)
    .then(landingPages => {
      let landingPage = landingPages[0]
      utility.callApi(`landingPage/landingPageState/${landingPage.initialState}`, 'delete', {}, req.headers.authorization)
        .then(result => {
          if (landingPage.submittedState && landingPage.submittedState.state) {
            utility.callApi(`landingPage/landingPageState/${landingPage.submittedState.state}`, 'delete', {}, req.headers.authorization)
              .then(result => {
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to delete landingPageState ${JSON.stringify(error)}`})
              })
          }
          utility.callApi(`landingPage/${req.params.id}`, 'delete', {}, req.headers.authorization)
            .then(result => {
              return res.status(200).json({status: 'success', payload: result})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to delete landingPage ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to delete landingPageState ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch landingPage ${JSON.stringify(error)}`})
    })
}
