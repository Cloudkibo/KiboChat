const utility = require('../utility')

exports.index = function (req, res) {
  utility.callApi(`api_settings/`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      res.status(200).json({status: 'success', payload: settings})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch API settings ${err}`})
    })
}

exports.enable = function (req, res) {
  utility.callApi(`api_settings/enable`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      res.status(200).json({status: 'success', payload: settings})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to enable API settings ${err}`})
    })
}

exports.disable = function (req, res) {
  utility.callApi(`api_settings/disable`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      res.status(200).json({status: 'success', payload: settings})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to disable API settings ${err}`})
    })
}

exports.reset = function (req, res) {
  utility.callApi(`api_settings/reset`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      res.status(200).json({status: 'success', payload: settings})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to reset API settings ${err}`})
    })
}
