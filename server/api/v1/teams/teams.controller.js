const logicLayer = require('./teams.logicLayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/pages/teams.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  let teamQuery = {companyId: req.user.companyId, platform: req.user.platform}
  if (req.body && req.body.pageId) {
    teamQuery.teamPagesIds = req.body.pageId
  }
  utility.callApi(`teams/query`, 'post', teamQuery) // fetch all teams of company
    .then(teams => {
      if (teams && teams.length > 0) {
        utility.callApi(`teams/agents/distinct`, 'post', {companyId: req.user.companyId}) // fetch distinct team agents
          .then(agentIds => {
            populateAgentIds(agentIds)
              .then(result => {
                utility.callApi(`user/query`, 'post', {_id: {$in: result.agentIds}}) // fetch unique agents info
                  .then(uniqueAgents => {
                    utility.callApi(`teams/pages/distinct`, 'post', {companyId: req.user.companyId}) // fetch distinct team pages
                      .then(pageIds => {
                        utility.callApi(`pages/query`, 'post', {_id: {$in: pageIds}}) // fetch unique pages info
                          .then(uniquePages => {
                            sendSuccessResponse(res, 200, {teams: teams, teamUniqueAgents: uniqueAgents, teamUniquePages: uniquePages})
                          })
                      })
                      .catch(error => {
                        const message = error || 'Failed to fetch distinct team pages'
                        logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                        sendErrorResponse(res, 500, `Failed to fetch distinct team pages ${JSON.stringify(error)}`)
                      })
                  })
                  .catch(error => {
                    const message = error || 'Failed to fetch unique team agents'
                    logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, `Failed to fetch unique team agents ${JSON.stringify(error)}`)
                  })
              })
          })
          .catch(error => {
            const message = error || 'Failed to fetch distinct team agents'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetch distinct team agents ${JSON.stringify(error)}`)
          })
      } else {
        sendSuccessResponse(res, 200, {teams: [], teamUniqueAgents: [], teamUniquePages: []})
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch teams'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch teams ${JSON.stringify(error)}`)
    })
}

exports.createTeam = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      let teamPayload = logicLayer.getTeamPayload(req, companyuser)
      let agentIds = req.body.agentIds
      let pageIds = req.body.pageIds
      utility.callApi(`teams`, 'post', teamPayload) // create team
        .then(createdTeam => {
          agentIds.forEach(agentId => {
            let teamAgentsPayload = logicLayer.getTeamAgentsPayload(createdTeam, companyuser, agentId)
            utility.callApi(`teams/agents`, 'post', teamAgentsPayload) // create team agent
              .then(createdAgent => {
              })
              .catch(error => {
                const message = error || 'Failed to create agent'
                logger.serverLog(message, `${TAG}: exports.createTeam`, req.body, {user: req.user}, 'error')
              })
          })
          if (req.body.pageIds) {
            pageIds.forEach(pageId => {
              let teamPagesPayload = logicLayer.getTeamPagesPayload(createdTeam, companyuser, pageId)
              utility.callApi(`teams/pages`, 'post', teamPagesPayload) // create team page
                .then(createdPage => {
                })
                .catch(error => {
                  const message = error || 'Failed to create page'
                  logger.serverLog(message, `${TAG}: exports.createTeam`, req.body, {user: req.user}, 'error')
                })
            })
          }
          sendSuccessResponse(res, 200, 'Team created successfully!')
        })
        .catch(error => {
          const message = error || 'Failed to create team'
          logger.serverLog(message, `${TAG}: exports.createTeam`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create team ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.createTeam`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.updateTeam = function (req, res) {
  let teamPayload = logicLayer.getUpdateTeamPayload(req.body)
  utility.callApi(`teams/${req.body._id}`, 'put', teamPayload) // update team
    .then(team => {
      sendSuccessResponse(res, 200, team)
    })
    .catch(error => {
      const message = error || 'Failed to update team'
      logger.serverLog(message, `${TAG}: exports.updateTeam`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to update team ${JSON.stringify(error)}`)
    })
}

exports.deleteTeam = function (req, res) {
  utility.callApi(`teams/delete/${req.params.id}`, 'delete', {}) // delete team
    .then(deletedTeam => {
      sendSuccessResponse(res, 200, 'Team deleted successfully!')
    })
    .catch(error => {
      const message = error || 'Failed to delete team'
      logger.serverLog(message, `${TAG}: exports.deleteTeam`, {}, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, `Failed to delete team ${JSON.stringify(error)}`)
    })
}

exports.addAgent = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      let agentPayload = logicLayer.getTeamAgentsPayload({_id: req.body.teamId}, companyuser, req.body.agentId)
      utility.callApi(`teams/agents/query`, 'post', agentPayload) // add page
        .then(findAgent => {
          if (findAgent.length > 0) {
            sendSuccessResponse(res, 200, 'Agent added successfully!')
          } else {
            utility.callApi(`teams/agents`, 'post', agentPayload) // add agent
              .then(craetedAgent => {
                sendSuccessResponse(res, 200, 'Agent added successfully!')
              })
              .catch(error => {
                const message = error || 'Failed to create team agent'
                logger.serverLog(message, `${TAG}: exports.addAgent`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to create team agent ${JSON.stringify(error)}`)
              })
          }
        }).catch(error => {
          const message = error || 'Failed to fetch agent'
          logger.serverLog(message, `${TAG}: exports.addAgent`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch agent ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.addAgent`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

exports.addPage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      let pagePayload = logicLayer.getTeamPagesPayload({_id: req.body.teamId}, companyuser, req.body.pageId)
      utility.callApi(`teams/pages/query`, 'post', pagePayload) // add page
        .then(findpage => {
          if (findpage.length > 0) {
            sendSuccessResponse(res, 200, 'Page added successfully!')
          } else {
            utility.callApi(`teams/pages`, 'post', pagePayload) // add page
              .then(craetedPage => {
                sendSuccessResponse(res, 200, 'Page added successfully!')
              })
              .catch(error => {
                const message = error || 'Failed to create team page'
                logger.serverLog(message, `${TAG}: exports.addPage`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to create team page ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          const message = error || 'Failed to fetch Page'
          logger.serverLog(message, `${TAG}: exports.addPage`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch Page ${JSON.stringify(error)}`)
        })
    }).catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.addPage`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

exports.removeAgent = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      for (let i = 0; i < req.body.agentId.length; i++) {
        let agentPayload = logicLayer.getTeamAgentsPayload({_id: req.body.teamId}, companyuser, req.body.agentId[i])
        utility.callApi(`teams/agents`, 'delete', agentPayload) // delete agent
          .then(deletedAgent => {
          })
          .catch(error => {
            const message = error || 'Failed to delete team agent'
            logger.serverLog(message, `${TAG}: exports.removeAgent`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to delete team agent ${JSON.stringify(error)}`)
          })
        if (i === req.body.agentId.length - 1) {
          sendSuccessResponse(res, 200, 'Agent deleted successfully!')
        }
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.removeAgent`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

exports.removePage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      for (let i = 0; i < req.body.pageId.length; i++) {
        let pagePayload = logicLayer.getTeamPagesPayload({_id: req.body.teamId}, companyuser, req.body.pageId[i])
        utility.callApi(`teams/pages`, 'delete', pagePayload) // delete page
          .then(craetedPage => {
          })
          .catch(error => {
            const message = error || 'Failed to delete team page'
            logger.serverLog(message, `${TAG}: exports.removePage`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to delete team page ${JSON.stringify(error)}`)
          })
        if (i === req.body.pageId.length - 1) {
          sendSuccessResponse(res, 200, 'Page deleted successfully!')
        }
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.removePage`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

exports.fetchAgents = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`teams/agents/query`, 'post', {teamId: req.params.id, companyId: companyuser.companyId}) // fetch agents
        .then(agents => {
          sendSuccessResponse(res, 200, agents)
        })
        .catch(error => {
          const message = error || 'Failed to fetch team agents'
          logger.serverLog(message, `${TAG}: exports.fetchAgents`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch team agents ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.fetchAgents`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

exports.fetchPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyuser => {
      utility.callApi(`teams/pages/query`, 'post', {teamId: req.params.id, companyId: companyuser.companyId}) // fetch pages
        .then(agents => {
          sendSuccessResponse(res, 200, agents)
        })
        .catch(error => {
          const message = error || 'Failed to fetch team pages'
          logger.serverLog(message, `${TAG}: exports.fetchPages`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch team pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company User'
      logger.serverLog(message, `${TAG}: exports.fetchPages`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company User ${JSON.stringify(error)}`)
    })
}

function populateAgentIds (agentIds) {
  return new Promise(function (resolve, reject) {
    let agentIdsToSend = []
    for (let i = 0; i < agentIds.length; i++) {
      if (agentIds[i].agentId) {
        agentIdsToSend.push(agentIds[i].agentId._id)
      }
    }
    resolve({agentIds: agentIdsToSend})
  })
}
