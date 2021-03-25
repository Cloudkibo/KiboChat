function isMobileBrowser () {
  return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
}

// encodeURIComponent doesn't encode single quotes and other chars.
// This wrapper function provides this functionality
function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16)
  })
}

function shouldShowOnGivenDevice (widget) {
  if (widget.displayPosition.display !== 'both') {
    if (isMobileBrowser()) {
      return widget.displayPosition.display === 'mobile'
    } else {
      return widget.displayPosition.display === 'desktop'
    }
  }
  return true
}

function getPositionBasedOnDevice (widget) {
  if (isMobileBrowser()) {
    return widget.displayPosition.mobilePosition
  } else {
    return widget.displayPosition.desktopPosition
  }
}

function getHeightBasedOnDevice (widget) {
  if (isMobileBrowser()) {
    return widget.displayPosition.mobileHeightOffset
  } else {
    return widget.displayPosition.desktopHeightOffset
  }
}

function getEdgeBasedOnDevice (widget) {
  if (isMobileBrowser()) {
    return widget.displayPosition.mobileEdgeOffset
  } else {
    return widget.displayPosition.desktopEdgeOffset
  }
}

function shouldShowOnThisPage (widget) {
  const currentPage = getCurrentPage()

  if (currentPage) {
    return widget.displayPages[currentPage]
  } else {
    return false
  }
}

function getCurrentPage () {
  const pathname = window.location.pathname

  if (pathname === '/') {
    return 'homePage'
  } else if (pathname === '/cart') {
    return 'cartPage'
  } else if (pathname.includes('account')) {
    return 'accountPages'
  } else if (pathname.split('/').length === 5 &&
  pathname.includes('collections') &&
  pathname.includes('products')
  ) {
    return 'productPages'
  } else if (pathname.split('/').length === 5 &&
  pathname.includes('thank_you')) {
    return 'thankyouPage'
  } else if (pathname.split('/').length === 4 &&
  pathname.includes('blogs')) {
    return 'blogPostPages'
  } else if (pathname.split('/').length === 3 &&
  pathname.includes('collections')) {
    return 'collectionsPage'
  } else if (pathname.split('/').length === 3 &&
  pathname.includes('pages')) {
    return 'urlsEndinginPages'
  }
  return undefined
}

function cookieExists (name) {
  return document.cookie.split(';').some(function (item) {
    return item.trim().indexOf(`${name}=`) === 0
  })
}

function setCookie (cname, cvalue, exdays) {
  var d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
  var expires = 'expires=' + d.toUTCString()
  document.cookie = cname + '=' + cvalue + ';' + expires + ';'
}

exports.isMobileBrowser = isMobileBrowser
exports.fixedEncodeURIComponent = fixedEncodeURIComponent
exports.shouldShowOnGivenDevice = shouldShowOnGivenDevice
exports.getPositionBasedOnDevice = getPositionBasedOnDevice
exports.shouldShowOnThisPage = shouldShowOnThisPage
exports.getHeightBasedOnDevice = getHeightBasedOnDevice
exports.getEdgeBasedOnDevice = getEdgeBasedOnDevice
exports.getCurrentPage = getCurrentPage
exports.cookieExists = cookieExists
exports.setCookie = setCookie
