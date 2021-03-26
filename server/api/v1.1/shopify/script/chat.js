const KiboButton = require('./widgets/KiboButton').KiboButton
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboChatButtonStyle = require('./styling').kiboChatButtonStyle
const kiboChatPopupStyle = require('./styling').kiboChatPopupStyle
const kiboChatWidgetStyle = require('./styling').kiboChatWidgetStyle

function initChatButtonWidget ({chat_widget: chatWidget, ...kiboBasicSetup}) {
  console.log('chatWidget', chatWidget)
  console.log('kiboBasicSetup', kiboBasicSetup)
  const widgetPosition = utils.getPositionBasedOnDevice(chatWidget)
  const widgetHeight = utils.getHeightBasedOnDevice(chatWidget)
  const widgetEdge = utils.getEdgeBasedOnDevice(chatWidget)

  if (utils.shouldShowOnGivenDevice(chatWidget) &&
  shouldShowOnThisPage(chatWidget)) {
    // Main button content
    const content = kiboContent.chatButton(chatWidget.textMessage.btnText,
      widgetPosition)

    // Main button styling
    const styling = kiboChatButtonStyle(
      chatWidget.btnDesign.iconColor,
      chatWidget.btnDesign.btnTextColor,
      chatWidget.btnDesign.backgroundColorStyle,
      chatWidget.btnDesign.backgroundColor1,
      chatWidget.btnDesign.backgroundColor2,
      widgetHeight,
      widgetEdge
    )

    // Main button content
    const popupContent = kiboContent.chatPopup(chatWidget.callOutCard.cardText,
      widgetPosition)

    // Button popup (callout) styling
    const popupStyling = kiboChatPopupStyle(widgetHeight, widgetEdge)

    // Deail after which call out should display over button
    const popupDelay = chatWidget.callOutCard.cardDelay

    const eventObjects = [
      {
        eventName: 'click',
        emitterId: 'kiboChatBtn',
        handlerFunc: function (e) {
          e.preventDefault()

          // TODO When analytics endpoint is done
          // add the logic to increase click count
          // on server side, when this is clicked
          this.hideButton()
          this.hidePopup()
          kiboChatWidget.showButton()
        }
      }
    ]

    let kiboButton = new KiboButton({
      content,
      styling,
      hasPopup: true,
      popupContent,
      popupStyling,
      popupDelay,
      eventObjects
    })

    showCallOut(chatWidget, kiboButton)
    const kiboChatWidget = showChatWidget(chatWidget)

    kiboButton.build()
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

function showCallOut (chatWidget, kiboButton) {
  if (chatWidget.callOutCard.enabled) {
    if (!utils.cookieExists('kiboCallOutSeen')) {
      kiboButton.showPopup()
      utils.setCookie('kiboCallOutSeen', true, 1)
    }
  }
}

function showChatWidget (chatWidget) {
  const widgetPosition = utils.getPositionBasedOnDevice(chatWidget)
  const widgetHeight = utils.getHeightBasedOnDevice(chatWidget)
  const widgetEdge = utils.getEdgeBasedOnDevice(chatWidget)

  const content = kiboContent.chatWidget(widgetPosition, chatWidget.greetingsWidget.titleText,
    chatWidget.greetingsWidget.helpText,
    chatWidget.greetingsWidget.offlineStoreMsg)

  const styling = kiboChatWidgetStyle(
    chatWidget.greetingsWidget.headingColor,
    chatWidget.greetingsWidget.descriptionColor,
    chatWidget.greetingsWidget.backgroundColorStyle,
    chatWidget.greetingsWidget.backgroundColor1,
    chatWidget.greetingsWidget.backgroundColor2,
    widgetHeight,
    widgetEdge
  )

  let kiboButton = new KiboButton({
    content,
    styling
  })

  kiboButton.build()

  return kiboButton
}

exports.initChatButtonWidget = initChatButtonWidget
