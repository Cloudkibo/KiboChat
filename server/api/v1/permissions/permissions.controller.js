const utility = require('../utility')
const logicLayer = require('./permissions.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1/permission/pages.controller.js'

exports.updatePermissions = function (req, res) {
  utility.callApi(`permissions/query`, 'post', { companyId: req.body.companyId, userId: req.body.userId })
    .then(permission => {
      permission = logicLayer.setPermissions(req.body)
      utility.callApi(`permissions/${permission._id}`, 'put', permission)
        .then(result => {
          res.status(201).json({status: 'success', payload: result})
        })
        .catch(error => {
          const message = error || 'Failed to update permissions'
          logger.serverLog(message, `${TAG}: exports.updatePermissions`, req.body, {user: req.user}, 'error')
          res.status(500).json({
            status: 'failed',
            description: error
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch permissions'
      logger.serverLog(message, `${TAG}: exports.updatePermissions`, req.body, {user: req.user}, 'error')
      res.status(500).json({status: 'failed', description: error})
    })
}

exports.changePermissions = function (req, res) {
  utility.callApi(`permissions/genericUpdate`, 'post', {query: {companyId: req.user.companyId, userId: req.user._id}, newPayload: req.body.payload, options: {upsert: true}}, 'accounts', req.headers.authorization)
    .then(result => {
      res.status(200).json({status: 'success', payload: 'Changes updated successfully'})
    })
    .catch(error => {
      const message = error || 'Failed to update permissions'
      logger.serverLog(message, `${TAG}: exports.changePermissions`, req.body, {user: req.user}, 'error')
      res.status(500).json({status: 'failed', description: error})
    })
}

exports.fetchPermissions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      utility.callApi(`permissions/query`, 'post', {companyId: companyUser.companyId})
        .then(permissions => {
          res.status(200).json({
            status: 'success',
            description: permissions
          })
        })
        .catch(error => {
          const message = error || 'Failed to fetch permissions'
          logger.serverLog(message, `${TAG}: exports.fetchPermissions`, {}, {user: req.user}, 'error')
          res.status(500).json({
            status: 'failed',
            description: error
          })
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.fetchPermissions`, {}, {user: req.user}, 'error')
      res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(error)}`
      })
    })
}

exports.fetchUserPermissions = function (req, res) {
  utility.callApi(`permissions/query`, 'post', {companyId: req.user.companyId, userId: req.user._id})
    .then(userPermission => {
      if (userPermission.length > 0) {
        userPermission = userPermission[0]
      }
      res.status(200).json({
        status: 'success',
        payload: userPermission
      })
    })
    .catch(error => {
      const message = error || 'Failed to fetch user permission'
      logger.serverLog(message, `${TAG}: exports.fetchUserPermissions`, {}, {user: req.user}, 'error')
      res.status(500).json({
        status: 'failed',
        description: `Unable to fetch user permission ${JSON.stringify(error)}`
      })
    })
}
