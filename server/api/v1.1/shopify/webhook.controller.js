/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/shopify/webhook.controller.js'
const mainScript = require('./mainScript')
const config = require('./../../../config/environment/index')
const dataLayer = require('./../abandoned_carts/abandoned_carts.datalayer')
const utilityAbandonedCart = require('./../abandoned_carts/utility_abandoned')

exports.handleCheckout = function (req, res) {
  const productIds = req.body.line_items.map((item) => {
    return item.product_id
  })
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const userId = results.userId
      const companyId = results.companyId
      const schedule = results.schedule
      dataLayer.findOneCartInfo({ cartToken: req.body.cart_token })
        .then(cart => {
          if (cart) {
            if (cart.userRef) {
              let d1 = new Date()
              if (schedule.condition === 'hours') {
                d1.setHours(d1.getHours() + Number(schedule.value))
              } else if (schedule.condition === 'minutes') {
                d1.setMinutes(d1.getMinutes() + Number(schedule.value))
              } else if (schedule.condition === 'days') {
                d1.setDate(d1.getDate() + Number(schedule.value))
              }
              const checkout = {
                shopifyCheckoutId: req.body.id,
                checkoutToken: req.body.token,
                cartToken: req.body.cart_token,
                storeId: shopId,
                userId: userId,
                companyId: companyId,
                totalPrice: req.body.total_price,
                abandonedCheckoutUrl: req.body.abandoned_checkout_url,
                productIds: productIds,
                status: 'pending',
                userRef: cart.userRef,
                scheduled_at: d1
              }
              // We need to update the analytics against this store
              dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: shopId }, { $inc: { totalAbandonedCarts: 1 } })
                .then(result1 => {
                  dataLayer.createCheckOutInfo(checkout)
                    .then(createdCheckout => res.status(200).json({ status: 'success', payload: createdCheckout }))
                    .catch(err => res.status(500).json({ status: 'failed', error: err }))
                })
                .catch(err => res.status(500).json({ status: 'failed', error: err }))
            } else {
              return res.status(200).json({ status: 'success', payload: 'cart not found' })
            }
          } else {
            return res.status(200).json({ status: 'success', payload: 'cart not found' })
          }
        })
        .catch(err => res.status(500).json({ status: 'failed', error: err }))
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleCart = function (req, res) {
  const productIds = req.body.line_items.map((item) => {
    return item.product_id
  })
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const userId = results.userId
      const companyId = results.companyId
      const cart = {
        shopifyCartId: req.body.id,
        cartToken: req.body.token,
        storeId: shopId,
        userId: userId,
        companyId: companyId,
        linePrice: 0,
        productIds: productIds,
        status: 'pending',
        userRef: ''
      }
      dataLayer.createCartInfo(cart)
        .then(createdCart => res.status(200).json({ status: 'success', payload: createdCart }))
        .catch(err => res.status(500).json({ status: 'failed', error: err }))
    })
    .catch(err => {
      if (Object.keys(err).length === 0) {
        return res.status(200).json({ status: 'failed', error: 'Cannot find storeInfo' })
      } else {
        return res.status(500).json({ status: 'failed', error: err })
      }
    })
}

exports.handleOrder = function (req, res) {
  dataLayer.findOneCheckOutInfo({ shopifyCheckoutId: req.body.checkout_id })
    .then(result => {
      if (result) {
        let newObj = {}
        if (result.status === 'pending') {
          newObj.isPurchased = true
        } else if (result.status === 'sent') {
          newObj.isPurchased = true
          newObj.isExtraSales = true // It denotes that the product was bought after we sent abandond cart in messngr
          // We need to update the total purchases in Analytics
          dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: result.storeId },
            { $inc: { totalPurchasedCarts: 1, totalExtraSales: req.body.total_price } })
            .then(updated => logger.serverLog(TAG, `Done updating checkout on new order ${JSON.stringify(updated)}`))
            .catch(err => logger.serverLog(TAG, `Error in updating checkout on new order ${JSON.stringify(err)}`))
        }
        // Saving the updated info
        dataLayer.findOneCheckOutInfoObjectAndUpdate({ shopifyCheckoutId: req.body.checkout_id }, newObj)
          .then(updated => {
            // res.status(200).json({ status: 'success', payload: updated })
            let order = result
            order.orderId = req.body.id
            order.number = req.body.number
            order.status = result.status
            order.order_status_url = req.body.order_status_url
            dataLayer.createOrderInfo(order)
              .then(updated => {
                dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: result.storeId },
                  { $inc: { totalAbandonedCarts: -1 } })
                  .then(updated => logger.serverLog(TAG, `Done updating checkout on new order ${JSON.stringify(updated)}`))
                  .catch(err => logger.serverLog(TAG, `Error in updating checkout on new order ${JSON.stringify(err)}`))
              })
              .catch(err => {
                const message = err || 'Error in creating order on new order'
                logger.serverLog(message, `${TAG}: exports.handleOrder`, req.body, {}, 'error')
              })
            return res.status(200).json({ status: 'failed' })
          })
          .catch(err => {
            const message = err || 'failed to update the checkout obj for new order'
            logger.serverLog(message, `${TAG}: exports.handleOrder`, req.body, {}, 'error')
            // res.status(500).json({ status: 'failed', error: err })
          })
      } else {
        return res.status(200).json({ status: 'failed' })
      }
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleAppUninstall = function (req, res) {
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const deleteCart = dataLayer.deleteAllCartInfoObjectsGeneric({ storeId: shopId })
      const deleteOrder = dataLayer.deleteAllOrderInfoObjectsGeneric({ storeId: shopId })
      const deleteCheckout = dataLayer.deleteAllCheckoutInfoObjects(shopId)
      const deleteStoreAnalytics = dataLayer.deleteAllStoreAnalyticsObjects({ storeId: shopId })
      const deleteStoreInfo = dataLayer.deleteAllStoreInfoObject({ shopUrl: shopUrl })
      Promise.all([deleteCart, deleteOrder, deleteCheckout, deleteStoreAnalytics, deleteStoreInfo])
        .then(result => {
          res.status(200).json({ status: 'success' })
        })
        .catch(err => {
          res.status(500).json({ status: 'failed', error: err })
        })
    })
    .catch((err) => {
      if (Object.keys(err).length === 0) {
        return res.status(200).json({ status: 'failed', error: 'Cannot find storeInfo' })
      } else {
        return res.status(500).json({ status: 'failed', error: err })
      }
    })
}

exports.handleThemePublish = function (req, res) {
  return res.status(200).json({ status: 'success' })
}

exports.serveScript = function (req, res) {
  const shopUrl = req.query.shop
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const pageId = results.pageId
      res.set('Content-Type', 'text/javascript')
      res.send(mainScript.renderJS(pageId, config.facebook.clientID, results.shopUrl))
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleNewCustomerRefId = function (payload) {
  // TODO: ADD Validation Check for payload
  // Get Page ID, commenting out as not used for now
  // const pageId = payload.recipient.id
  // Get USER REF (Note USER REF is also the cart TOKEN)
  const userRef = payload.optin.user_ref

  const cartToken = payload.optin.user_ref.split('-')[0]

  dataLayer.findOneCartInfo({ cartToken: cartToken, userRef: '' })
    .then(cart => {
      dataLayer.findOneCartInfoObjectAndUpdate({ cartToken: cartToken, userRef: '' }, { userRef })
        .then(updated => logger.serverLog(TAG, `Updated cart info ${JSON.stringify(updated)}`))
        .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
      return dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: cart.storeId }, { $inc: { totalSubscribers: 1 } })
    })
    .then(updated => logger.serverLog(TAG, `Updated Store analytics ${JSON.stringify(updated)}`))
    .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
}

exports.handleNewSubscriber = function (payload) {
  const userRef = payload.identifier

  const cartToken = userRef.split('-')[0]

  dataLayer.findOneCartInfoObjectAndUpdate({ cartToken, userRef }, { subscriberId: payload.senderId })
    .then(updated => {
      return dataLayer.findOneCheckOutInfoObjectAndUpdate({ cartToken, userRef }, { subscriberId: payload.senderId })
    })
    .then(updated => {
      return dataLayer.findOneOrderInfoObjectAndUpdate({ cartToken, userRef }, { subscriberId: payload.senderId })
    })
    .then(updated => {
    })
    .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
}

exports.clickCount = function (req, res) {
  dataLayer.findOneCheckOutInfo({ _id: req.query.checkoutId })
    .then(result => {
      if (!result) { return res.status(500).json({ status: 'failed', description: 'Cannot redirect to abandoned checkout' }) }
      dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: result.storeId }, { $inc: { totalClicks: 1 } })
        .then(updated => logger.serverLog(TAG, `Done updating click count ${JSON.stringify(updated)}`))
        .catch(err => logger.serverLog(TAG, `Error in updating click count ${JSON.stringify(err)}`))
      return res.redirect(result.abandonedCheckoutUrl)
    })
    .catch(err => {
      const message = err || 'Error in click count'
      logger.serverLog(message, `${TAG}: exports.clickCount`, {}, {}, 'error')
      return res.status(500).json({ status: 'failed', description: 'Failed to find the checkout' })
    })
}

exports.fulfillmentCreate = function (req, res) {
  return res.status(200).json({ status: 'success' })
}

exports.fulfillmentUpdate = function (req, res) {
  return res.status(200).json({ status: 'success' })
}

exports.fulfillmentEventsCreate = function (req, res) {
  return res.status(200).json({ status: 'success' })
}

exports.ordersCancelled = function (req, res) {
  let orderId = req.body.id
  let totalPrice = req.body.total_price
  let message = `Your order with id ${orderId} has been cancelled. The total price of order is ${totalPrice}`
  utilityAbandonedCart.sendOrderStatus(req.body.id, message, (err, status) => {
    if (err) {
      const message = err || 'Error in sending orde cancel status'
      return logger.serverLog(message, `${TAG}: exports.ordersCancelled`, req.body, {}, 'error')
    }
  })
  dataLayer.findOneOrderInfoObjectAndUpdate({ orderId: orderId }, { status: 'cancelled' })
    .then(() => {
    })
    .catch((err) => {
      const message = err || 'Order status updated for cancelled failed'
      logger.serverLog(message, `${TAG}: exports.ordersCancelled`, req.body, {}, 'error')
    })
  return res.status(200).json({ status: 'success' })
}

exports.ordersFulfilled = function (req, res) {
  let orderId = req.body.id
  let totalPrice = req.body.total_price
  let message = `Your order with id ${orderId} has been confirmed. The total price of order is ${totalPrice}`
  utilityAbandonedCart.sendOrderStatus(req.body.id, message, (err, status) => {
    if (err) {
      const message = err || 'Error in sending orde confirmed status'
      return logger.serverLog(message, `${TAG}: exports.ordersFulfilled`, req.body, {}, 'error')
    }
  })
  dataLayer.findOneOrderInfoObjectAndUpdate({ orderId: orderId }, { status: 'confirmed' })
    .then(() => {
    })
    .catch((err) => {
      const message = err || 'Order status updated for confirmed failed'
      return logger.serverLog(message, `${TAG}: exports.ordersFulfilled`, req.body, {}, 'error')
    })
  return res.status(200).json({ status: 'success' })
}

exports.ordersPaid = function (req, res) {
  let orderId = req.body.id
  let gateway = req.body.gateway
  let status = req.body.financial_status
  let totalPrice = req.body.total_price
  let message = `Payment for your order with id ${orderId} has been confirmed as ${status} using payment method ${gateway}. The total price of order is ${totalPrice}`
  utilityAbandonedCart.sendOrderStatus(req.body.id, message, (err, status) => {
    if (err) {
      const message = err || 'Error in sending order status'
      return logger.serverLog(message, `${TAG}: exports.ordersPaid`, req.body, {}, 'error')
    }
  })
  dataLayer.findOneOrderInfoObjectAndUpdate({ orderId: orderId }, { status: 'paid' })
    .then(() => {
    })
    .catch((err) => {
      const message = err || 'Order status updated for paid failed'
      logger.serverLog(message, `${TAG}: exports.ordersPaid`, req.body, {}, 'error')
    })
  return res.status(200).json({ status: 'success' })
}

exports.orderUpdate = function (req, res) {
  if (req.body.financial_status === 'refunded' || req.body.financial_status === 'partially_refunded') {
    let orderId = req.body.id
    let totalPrice = req.body.total_price
    let amountRefunded = req.body.refunds[0].transactions[0].amount
    let message = `Your order with id ${orderId} has been refunded and amount refunded is ${amountRefunded}. The total price of order is ${totalPrice}`
    utilityAbandonedCart.sendOrderStatus(req.body.id, message, (err, status) => {
      if (err) {
        const message = err || 'Error in sending orde cancel status'
        logger.serverLog(message, `${TAG}: exports.orderUpdate`, req.body, {}, 'error')
      }
    })
    dataLayer.findOneOrderInfoObjectAndUpdate({ orderId: orderId }, { status: 'refunded' })
      .then(() => {
      })
      .catch((err) => {
        const message = err || 'Order status updated for refund failed'
        logger.serverLog(message, `${TAG}: exports.orderUpdate`, req.body, {}, 'error')
      })
  }
  return res.status(200).json({ status: 'success' })
}
