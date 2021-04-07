const KiboModal = require('./widgets/KiboModal').KiboModal
const KiboSection = require('./widgets/KiboSection').KiboSection
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboOptinModalStyle = require('./styling').kiboOptinModalStyle
const { thankYouPageOptinStyle } = require('./styling')

const kiboCompanyId = window.__kibocompany__
const kiboDomain = window.__kibodomain__
const urlForSubmission = `${kiboDomain}/api/supernumber/storeOptinNumberFromWidget`
const urlForOrderNotification = `${kiboDomain}/api/shopify/newOrderFromWidget`

function initOptinWidget ({optin_widget: optinWidget, ...kiboBasicSetup}) {
  if (!utils.cookieExists('kiboOptinReceived')) {
    if (optinWidget.settings.landingOnCartPage &&
      utils.getCurrentPage() === 'cartPage') {
      setupModal(optinWidget)
    }
    if ((optinWidget.settings.checkoutClicked ||
      optinWidget.settings.buyNowClicked) &&
      utils.getCurrentPage() === 'checkoutPage') {
      setupModal(optinWidget)
    }
    if (optinWidget.settings.addToCartClicked) {
      setupCartBtnListener(optinWidget)
    }
    if (optinWidget.settings.thankYouPage &&
      utils.getCurrentPage() === 'thankyouPage') {
      setupThankYouOptin()
    }
  } else if (utils.getCurrentPage() === 'thankyouPage') {
    setupOrderConfirmationFlow(optinWidget)
  }
}

function setupCartBtnListener (optinWidget) {
  const addToCartBtn = document.querySelector('[data-add-to-cart]')
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', (e) => {
      e.preventDefault()

      setupModal(optinWidget, '/cart')

      let productName = window.location.pathname.split('/')[4]
      productName = productName || window.location.pathname.split('/')[2]

      fetchProductInfo(productName, item => {
        const variant = getSelectedVariant(item)
        const cartPayload = [
          {
            id: variant.id,
            quantity: 1
          }
        ]
        addToCart(cartPayload)
      })
    })
  }
}

function setupModal (optinWidget, redirect) {
  function processOptinSubmission (e) {
    if (e.preventDefault) e.preventDefault()

    const name = e.target.name.value
    const number = e.target.contactNumber.value

    const HttpForOptinSubmission = new XMLHttpRequest()
    HttpForOptinSubmission.open('POST', urlForSubmission)
    HttpForOptinSubmission.setRequestHeader('Content-Type', 'application/json')
    HttpForOptinSubmission.send(JSON.stringify({
      companyId: kiboCompanyId, name: name, contactNumber: number
    }))

    HttpForOptinSubmission.onreadystatechange = function (e) {
      if (this.readyState === 4 && this.status === 200) {
        const respBody = JSON.parse(HttpForOptinSubmission.responseText)
        utils.setCookie('kiboOptinReceived', true, 1)
        utils.setCookie('kiboOptinId', respBody.payload._id, 1)
        if (redirect) {
          const hostOrigin = window.location.origin
          window.location.href = hostOrigin + redirect
        }
      }
    }

    this.close()
  }

  let kiboModal = new KiboModal({
    content: kiboContent.optinWidget[optinWidget.language],
    styling: kiboOptinModalStyle,
    customEventObjectId: 'kibo-optin-form',
    customEventHandler: processOptinSubmission
  })
  kiboModal.open()
}

function setupThankYouOptin () {
  const eventObjects = [
    {
      eventName: 'click',
      emitterId: 'kiboWhatsappOptinBtn',
      handlerFunc: function (e) {
        e.preventDefault()

        const inputField = this.kibosection.querySelector('#kiboWhatsappInput')
        const number = inputField.value

        // Getting reference of this for http request callback
        const _ = this

        const HttpForOptinSubmission = new XMLHttpRequest()
        HttpForOptinSubmission.open('POST', urlForSubmission)
        HttpForOptinSubmission.setRequestHeader('Content-Type', 'application/json')
        HttpForOptinSubmission.send(JSON.stringify({
          companyId: kiboCompanyId, contactNumber: number
        }))

        HttpForOptinSubmission.onreadystatechange = function (e) {
          if (this.readyState === 4 && this.status === 200) {
            const respBody = JSON.parse(HttpForOptinSubmission.responseText)
            utils.setCookie('kiboOptinReceived', true, 1)
            utils.setCookie('kiboOptinId', respBody.payload._id, 1)
            _.kibosection.style.display = 'none'
            _.kibosection.style.visibility = 'hidden'
            setupOrderConfirmationFlow()
            console.log('Done and sent thank you optin')
          }
        }
      }
    }
  ]

  let kiboSection = new KiboSection({
    content: kiboContent.thankYouPageOptin,
    styling: thankYouPageOptinStyle(),
    siblingClass: 'content-box',
    eventObjects
  })
  kiboSection.build()
}

function setupOrderConfirmationFlow () {
  const orderNumber = document.querySelector('[class="os-order-number"]').innerHTML.trim().split(' ')[1]

  if (utils.cookieExists('kiboOptinId')) {
    const HttpForOptinSubmission = new XMLHttpRequest()
    HttpForOptinSubmission.open('POST', urlForOrderNotification)
    HttpForOptinSubmission.setRequestHeader('Content-Type', 'application/json')
    HttpForOptinSubmission.send(JSON.stringify({
      companyId: kiboCompanyId,
      contactId: utils.readCookie('kiboOptinId'),
      orderId: orderNumber
    }))

    HttpForOptinSubmission.onreadystatechange = function (e) {
      if (this.readyState === 4 && this.status === 200) {
        console.log('order notification sent')
      }
    }
  }
}

// utils related to this module only

function fetchProductInfo (handle, cb) {
  const HttpForProductInfo = new XMLHttpRequest()
  HttpForProductInfo.open('GET', `/products/${handle}.js`)
  HttpForProductInfo.setRequestHeader('Content-Type', 'application/json')
  HttpForProductInfo.send()

  HttpForProductInfo.onreadystatechange = function (e) {
    if (this.readyState === 4 && this.status === 200) {
      const respBody = JSON.parse(HttpForProductInfo.responseText)
      cb(respBody)
    }
  }
}

function addToCart (cartObj) {
  const HttpForAddToCart = new XMLHttpRequest()
  HttpForAddToCart.open('POST', '/cart/add.js')
  HttpForAddToCart.setRequestHeader('Content-Type', 'application/json')
  HttpForAddToCart.send(JSON.stringify({
    items: cartObj
  }))

  HttpForAddToCart.onreadystatechange = function (e) {
    if (this.readyState === 4 && this.status === 200) {
      console.log('cart updated.')
    }
  }
}

function getSelectedVariant (item) {
  const optionsLength = item.options.length

  let option1Value = null
  let option2Value = null
  let option3Value = null

  if (optionsLength === 1) {
    option1Value = document.querySelector('[data-index="option1"]').value
  } else if (optionsLength === 2) {
    option1Value = document.querySelector('[data-index="option1"]').value
    option2Value = document.querySelector('[data-index="option2"]').value
  } else if (optionsLength === 3) {
    option1Value = document.querySelector('[data-index="option1"]').value
    option2Value = document.querySelector('[data-index="option2"]').value
    option3Value = document.querySelector('[data-index="option3"]').value
  }

  for (let i = 0; i < item.variants.length; i++) {
    const variant = item.variants[i]
    if (optionsLength === 1) {
      if (variant.option1 === option1Value) {
        return variant
      }
    } else if (optionsLength === 2) {
      if (variant.option1 === option1Value &&
        variant.option2 === option2Value) {
        return variant
      }
    } else if (optionsLength === 3) {
      if (variant.option1 === option1Value &&
        variant.option2 === option2Value &&
        variant.option3 === option3Value) {
        return variant
      }
    }
  }

  return null
}

exports.initOptinWidget = initOptinWidget
