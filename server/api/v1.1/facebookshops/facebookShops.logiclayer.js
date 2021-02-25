const logger = require('../../../components/logger')
const TAG = 'api/v1.1/facebookShops/facebookShops.logiclayer.js'
const { facebookApiCaller } = require('../../global/facebookApiCaller')

exports.checkFacebookPermissions = async function (facebookInfo) {
  try {
    let catalogPermissionGiven = false
    let businessPermissionGiven = false
    let readOrderPermissionGiven = false
    let manageOrderPermissionGiven = false
    let query = `${facebookInfo.fbId}/permissions?access_token=${facebookInfo.fbToken}`
    let permissions = await facebookApiCaller('v6.0', query, 'get')
    permissions = permissions.body.data
    for (let i = 0; i < permissions.length; i++) {
      if (permissions[i].permission === 'catalog_management') {
        if (permissions[i].status === 'granted') {
          catalogPermissionGiven = true
        }
      }
      if (permissions[i].permission === 'business_management') {
        if (permissions[i].status === 'granted') {
          businessPermissionGiven = true
        }
      }
      if (permissions[i].permission === 'commerce_account_read_orders') {
        if (permissions[i].status === 'granted') {
          readOrderPermissionGiven = true
        }
      }
      if (permissions[i].permission === 'commerce_account_manage_orders') {
        if (permissions[i].status === 'granted') {
          manageOrderPermissionGiven = true
        }
      }
    }
    // Note: comment out this line in future when FB opens these permissinos from closed beta.
    // These are are for checking order status on Facebook Shops
    // - Sojharo
    // return (catalogPermissionGiven && businessPermissionGiven && readOrderPermissionGiven && manageOrderPermissionGiven)
    return (catalogPermissionGiven && businessPermissionGiven)
  } catch (err) {
    const message = err || 'Internal Server Error'
    logger.serverLog(message, `${TAG}: exports.checkFacebookPermissions`, facebookInfo, {}, 'error')
    return false
  }
}
