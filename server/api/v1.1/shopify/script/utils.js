// Browser PollyFill for using after method on DOM nodes
// from: https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/after()/after().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty('after')) {
      return
    }
    Object.defineProperty(item, 'after', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function after () {
        var argArr = Array.prototype.slice.call(arguments)
        var docFrag = document.createDocumentFragment()

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)))
        })

        this.parentNode.insertBefore(docFrag, this.nextSibling)
      }
    })
  })
})([Element.prototype, CharacterData.prototype, DocumentType.prototype])

const weekday = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

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
  } else if (pathname.split('/').length === 3 &&
  pathname.includes('products')) {
    return 'productPages'
  } else if (pathname.includes('checkouts')) {
    return 'checkoutPage'
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

function _converToOtherTimeZone (timezoneOffset) {
  // current location's date time
  const localDate = new Date()

  // current location's time in milliseconds
  const localTime = localDate.getTime()

  // obtain local UTC offset and convert to milliseconds
  const localOffset = localDate.getTimezoneOffset() * 60 * 1000

  // obtain the current utc time
  const utc = localTime + localOffset

  // obtain destination utc offset in miliseconds
  const destOffSet = parseFloat(timezoneOffset.replace(':', '.'))

  // obtain destination utc time
  const destUtcTime = utc + (3600000 * destOffSet)

  // get new date with destination with store's local time
  const destDate = new Date(destUtcTime)

  return destDate
}

function getStoresLocalTime (storesLocalTimeZone) {
  // obtain destination (store's) utc offset in miliseconds
  const destOffSet = storesLocalTimeZone.split(' ')[0].substring(4, 10)

  const destDate = _converToOtherTimeZone(destOffSet)

  const storesTimePayload = {
    day: weekday[destDate.getDay()],
    hours: destDate.getHours(),
    minutes: destDate.getMinutes()
  }

  return storesTimePayload
}

function isSupportOpen (currentTime, supportSchedule) {
  const dayObj = supportSchedule[currentTime.day]

  const startHour = parseInt(dayObj.startTime.split(':')[0])
  const endHour = parseInt(dayObj.endTime.split(':')[0])

  const startMinute = parseInt(dayObj.startTime.split(':')[1])
  const endMinute = parseInt(dayObj.endTime.split(':')[1])

  const currentHour = currentTime.hours
  const currentMinute = currentTime.minutes

  if (startHour === endHour) {
    if (currentMinute >= startMinute && currentMinute < endMinute) {
      return true
    } else {
      return false
    }
  }

  if (currentHour === startHour) {
    if (currentMinute >= startMinute) {
      return true
    } else {
      return false
    }
  }

  if (currentHour === endHour) {
    if (currentMinute <= endMinute) {
      return true
    } else {
      return false
    }
  }

  if (currentHour > startHour && currentHour < endHour) {
    return true
  }

  return false
}

function storeClickCount (widgetType) {
  const kiboCompanyId = window.__kibocompany__
  const kiboDomain = window.__kibodomain__

  const clickCountUrl = `${kiboDomain}/api/superNumber/storeWidgetButtonClick`
  const pageUrl = window.location.href

  // Going to fetch basic super number preferences of merchant from server
  const HttpForURLClick = new XMLHttpRequest()
  HttpForURLClick.open('POST', clickCountUrl)
  HttpForURLClick.setRequestHeader('Content-Type', 'application/json')
  HttpForURLClick.send(JSON.stringify({
    companyId: kiboCompanyId, pageUrl, widgetType
  }))

  HttpForURLClick.onreadystatechange = function (e) {
    if (this.readyState === 4 && this.status === 200) {
      // TODO any state management work in future
    }
  }
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
exports.getStoresLocalTime = getStoresLocalTime
exports.isSupportOpen = isSupportOpen
exports.storeClickCount = storeClickCount
