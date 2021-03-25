const KiboButton = require('./widgets/KiboButton').KiboButton
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboChatButtonStyle = require('./styling').kiboChatButtonStyle

function initChatButtonWidget ({chat_widget: chatWidget, ...kiboBasicSetup}) {
  console.log('chatWidget', chatWidget)
  console.log('kiboBasicSetup', kiboBasicSetup)
  const widgetPosition = utils.getPositionBasedOnDevice(chatWidget)
  const widgetHeight = utils.getHeightBasedOnDevice(chatWidget)
  const widgetEdge = utils.getEdgeBasedOnDevice(chatWidget)

  if (utils.shouldShowOnGivenDevice(chatWidget) &&
  shouldShowOnThisPage(chatWidget)) {
    const content = kiboContent.chatButton(chatWidget.textMessage.btnText,
      widgetPosition, chatWidget.textMessage.message,
      chatWidget.callOutCard.cardText)

    const styling = kiboChatButtonStyle(
      chatWidget.btnDesign.iconColor,
      chatWidget.btnDesign.btnTextColor,
      chatWidget.btnDesign.backgroundColorStyle,
      chatWidget.btnDesign.backgroundColor1,
      chatWidget.btnDesign.backgroundColor2,
      widgetHeight,
      widgetEdge
    )

    let kiboButton = new KiboButton({
      content,
      styling
    })

    showCallOut(chatWidget)

    kiboButton.show()
  }
}

function shouldShowOnThisPage (chatWidget) {
  const currentPage = utils.getCurrentPage()

  if (currentPage === 'cartPage') {
    if (utils.isMobileBrowser()) {
      return chatWidget.displayPages.cartPageMobile
    } else {
      return chatWidget.displayPages.cartPageDesktop
    }
  }

  return utils.shouldShowOnThisPage(chatWidget)
}

function showCallOut (chatWidget) {
  if (chatWidget.callOutCard.enabled) {
    const delay = chatWidget.callOutCard.cardDelay
    if (!utils.cookieExists('kiboCallOutSeen')) {
      setTimeout(() => {
        const callOut = document.getElementsByClassName('kibo-call-out')[0]
        callOut.style.visibility = 'visible'
        callOut.style.opacity = 1
        utils.setCookie('kiboCallOutSeen', true, 1)
      }, (delay * 1000))
    }
  }
}

exports.initChatButtonWidget = initChatButtonWidget
