const { callApi } = require('./../v1.1/utility')
const TAG = 'api/global/billingPricing.js'
const logger = require('../../components/logger')

exports.updateCompanyUsage = function (companyId, feature, increment) {
  const updatedData = {}
  updatedData[feature] = increment
  callApi(
    'featureUsage/updateCompany',
    'put',
    {
      query: {companyId},
      newPayload: {$inc: updatedData},
      options: {}
    }
  )
    .then(updated => {
      logger.serverLog(TAG, `${feature} usage updated successfully for ${companyId}`, 'debug')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update ${feature} usage for ${companyId}`, 'error')
      logger.serverLog(TAG, err, 'error')
    })
}
