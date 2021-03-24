const KiboButton = require('./widgets/KiboButton').KiboButton
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboShareButtonStyle = require('./styling').kiboShareButtonStyle

function initShareButtonWidget ({share_button: shareButton, ...kiboBasicSetup}) {
  console.log('shareButton', shareButton)
  console.log('kiboBasicSetup', kiboBasicSetup)
  const widgetPosition = getPositionBasedOnDevice(shareButton)

  if (shouldShowOnGivenDevice(shareButton) &&
  shouldShowOnThisPage(shareButton)) {
    const content = kiboContent.shareButton(shareButton.textMessage.btnText,
      widgetPosition, shareButton.textMessage.message)

    const styling = kiboShareButtonStyle(
      shareButton.btnDesign.iconColor,
      shareButton.btnDesign.btnTextColor,
      shareButton.btnDesign.backgroundColorStyle,
      shareButton.btnDesign.backgroundColor1,
      shareButton.btnDesign.backgroundColor2
    )

    let kiboButton = new KiboButton({
      content,
      styling
    })

    kiboButton.show()
  }
}

function getPositionBasedOnDevice (shareButton) {
  if (utils.isMobileBrowser()) {
    return shareButton.displayPosition.mobilePosition
  } else {
    return shareButton.displayPosition.desktopPosition
  }
}

function shouldShowOnGivenDevice (shareButton) {
  if (shareButton.displayPosition.display !== 'both') {
    if (utils.isMobileBrowser()) {
      return shareButton.displayPosition.display === 'mobile'
    } else {
      return shareButton.displayPosition.display === 'desktop'
    }
  }
  return true
}

function shouldShowOnThisPage (shareButton) {
  const currentPage = getCurrentPage()

  if (currentPage) {
    return shareButton.displayPages[currentPage]
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

exports.initShareButtonWidget = initShareButtonWidget
