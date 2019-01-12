const logicLayer = require('./teams.logicLayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/pages/teams.controller.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`teams/query`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch all teams of company
        .then(teams => {
          utility.callApi(`teams/agents/distinct`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch distinct team agents
            .then(agentIds => {
              utility.callApi(`user/query`, 'post', {_id: {$in: agentIds}}, req.headers.authorization) // fetch unique agents info
                .then(uniqueAgents => {
                  utility.callApi(`teams/pages/distinct`, 'post', {companyId: companyuser.companyId}, req.headers.authorization) // fetch distinct team pages
                    .then(pageIds => {
                      utility.callApi(`pages/query`, 'post', {_id: {$in: pageIds}}, req.headers.authorization) // fetch unique pages info
                        .then(uniquePages => {
                          return res.status(200).json({
                            status: 'success',
                            payload: {teams: teams, teamUniqueAgents: uniqueAgents, teamUniquePages: uniquePages}
                          })
                        })
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch distinct team pages ${JSON.stringify(error)}`
                      })
                    })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch unique team agents ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch distinct team agents ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch teams ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.createTeam = function (req, res) {
  console.log('createTeam', req.boy)
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let teamPayload = logicLayer.getTeamPayload(req, companyuser)
      let agentIds = req.body.agentIds
      let pageIds = req.body.pageIds
      utility.callApi(`teams`, 'post', teamPayload) // create team
        .then(createdTeam => {
          agentIds.forEach(agentId => {
            let teamAgentsPayload = logicLayer.getTeamAgentsPayload(createdTeam, companyuser, agentId)
            utility.callApi(`teams/agents`, 'post', teamAgentsPayload, req.headers.authorization) // create team agent
              .then(createdAgent => {
                logger.serverLog(TAG, 'Team agent created successfully!')
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to create agent ${JSON.stringify(error)}`)
              })
          })
          pageIds.forEach(pageId => {
            let teamPagesPayload = logicLayer.getTeamPagesPayload(createdTeam, companyuser, pageId)
            utility.callApi(`teams/pages`, 'post', teamPagesPayload, req.headers.authorization) // create team page
              .then(createdPage => {
                logger.serverLog(TAG, 'Team page created successfully!')
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to create page ${JSON.stringify(error)}`)
              })
          })
          return res.status(200).json({
            status: 'success',
            payload: 'Team created successfully!'
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create team ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.updateTeam = function (req, res) {
  let teamPayload = logicLayer.getUpdateTeamPayload(req.body)
  utility.callApi(`teams/${req.body._id}`, 'put', teamPayload, req.headers.authorization) // update team
    .then(team => {
      return res.status(200).json({
        status: 'success',
        payload: team
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to update team ${JSON.stringify(error)}`
      })
    })
}

exports.deleteTeam = function (req, res) {
  utility.callApi(`teams/delete/${req.params.id}`, 'delete', {}, req.headers.authorization) // delete team
    .then(deletedTeam => {
      return res.status(200).json({
        status: 'success',
        payload: 'Team deleted successfully!'
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to delete team ${JSON.stringify(error)}`
      })
    })
}

exports.addAgent = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let agentPayload = logicLayer.getTeamAgentsPayload({_id: req.body.teamId}, companyuser, req.body.agentId)
      utility.callApi(`teams/agents`, 'post', agentPayload, req.headers.authorization) // add agent
        .then(craetedAgent => {
          return res.status(200).json({
            status: 'success',
            payload: 'Agent added successfully!'
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create team agent ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}

exports.addPage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let pagePayload = logicLayer.getTeamPagesPayload({_id: req.body.teamId}, companyuser, req.body.pageId)
      utility.callApi(`teams/pages`, 'post', pagePayload, req.headers.authorization) // add page
        .then(craetedPage => {
          return res.status(200).json({
            status: 'success',
            payload: 'Page added successfully!'
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create team page ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}

exports.removeAgent = function (req, res) {
  console.log('removeAgent funcion called')
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let agentPayload = logicLayer.getTeamAgentsPayload({_id: req.body.teamId}, companyuser, req.body.agentId)
      utility.callApi(`teams/agents`, 'delete', agentPayload, req.headers.authorization) // delete agent
        .then(deletedAgent => {
          return res.status(200).json({
            status: 'success',
            payload: 'Agent deleted successfully!'
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to delete team agent ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}

exports.removePage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let pagePayload = logicLayer.getTeamPagesPayload({_id: req.body.teamId}, companyuser, req.body.pageId)
      utility.callApi(`teams/pages`, 'delete', pagePayload, req.headers.authorization) // delete page
        .then(craetedPage => {
          return res.status(200).json({
            status: 'success',
            payload: 'Page deleted successfully!'
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to delete team page ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}

exports.fetchAgents = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`teams/agents/query`, 'post', {teamId: req.params.id, companyId: companyuser.companyId}, req.headers.authorization) // fetch agents
        .then(agents => {
          return res.status(200).json({
            status: 'success',
            payload: agents
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch team agents ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}

exports.fetchPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`teams/pages/query`, 'post', {teamId: req.params.id, companyId: companyuser.companyId}, req.headers.authorization) // fetch pages
        .then(agents => {
          return res.status(200).json({
            status: 'success',
            payload: agents
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch team pages ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company User ${JSON.stringify(error)}`
      })
    })
}
