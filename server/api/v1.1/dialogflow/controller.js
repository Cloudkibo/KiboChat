const { getDialogFlowClient } = require('../../global/dialogflow')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const { callApi } = require('../utility')
const TAG = '/api/v1.1/dialogflow/controller.js'

exports.fetchAgents = async function (req, res) {
  try {
    const dialogflow = await getDialogFlowClient(req.user.companyId)
    const result = await dialogflow.projects.agent.search({ parent: 'projects/-' })
    if (result && result.data && result.data.agents) {
      sendSuccessResponse(res, 200, result.data.agents)
    } else {
      throw new Error('An unexpected error occured. Please try again later.')
    }
  } catch (err) {
    const message = err || 'Failed to fetch dialogflow agents'
    logger.serverLog(message, `${TAG}: exports.fetchAgents`, {}, {user: req.user}, 'error')
    sendErrorResponse(res, 500, '', `Failed to update integration ${err}`)
  }
}

exports.removeAgent = function (req, res) {
  // remove dialogFlowagentid from chatbot
  // remove intentid from chatbot message blocks
  const platform = req.body.platform
  if (platform === 'messenger') {
    const removeDialogFlowAgent = callApi(
      'chatbots',
      'put',
      {
        purpose: 'updateOne',
        match: {_id: req.body.chatbotId, dialogFlowAgentId: req.body.dialogFlowAgentId},
        updated: {$unset: {dialogFlowAgentId: 1}}
      },
      'kibochat'
    )
    const removeDialogFlowIntents = callApi(
      'messageBlocks',
      'put',
      {
        purpose: 'updateAll',
        match: {'module.type': 'chatbot', 'module.id': req.body.chatbotId, dialogFlowIntentId: {$exists: true}},
        updated: {$unset: {dialogFlowIntentId: 1}}
      },
      'kiboengage'
    )
    Promise.all([removeDialogFlowAgent, removeDialogFlowIntents])
      .then(result => {
        sendSuccessResponse(res, 200, null, 'DialogFlow agent removed successfully!')
      })
      .catch(err => {
        const message = err || 'Failed to remove dialogflow agent'
        logger.serverLog(message, `${TAG}: exports.removeAgent`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to remove dialogflow agent.`)
      })
  } else if (['whatsApp', 'sms'].includes(platform)) {
    const removeDialogFlowAgent = callApi(
      'chatbot',
      'put',
      {
        query: {chatbotId: req.body.chatbotId, dialogFlowAgentId: req.body.dialogFlowAgentId},
        updated: {dialogFlowAgentId: null}
      },
      'kibodash'
    )
    const removeDialogFlowIntents = callApi(
      'chatbotBlock',
      'put',
      {
        query: {chatbotId: req.body.chatbotId, dialogFlowIntentId: {$operator: 'not', $value: null}},
        updated: {dialogFlowIntentId: null}
      },
      'kibodash'
    )
    Promise.all([removeDialogFlowAgent, removeDialogFlowIntents])
      .then(result => {
        sendSuccessResponse(res, 200, null, 'DialogFlow agent removed successfully!')
      })
      .catch(err => {
        const message = err || 'Failed to remove dialogflow agent'
        logger.serverLog(message, `${TAG}: exports.removeAgent`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to remove dialogflow agent.`)
      })
  } else {
    sendErrorResponse(res, 403, 'Invalid platform is provided!')
  }
}
