const KiboChat = require('./widgets/KiboChat').KiboChat
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboChatButtonStyle = require('./styling').kiboChatButtonStyle
const kiboChatPopupStyle = require('./styling').kiboChatPopupStyle
const kiboChatWidgetStyle = require('./styling').kiboChatWidgetStyle

function initChatButtonWidget ({chat_widget: chatWidget, ...kiboBasicSetup}) {
  if (utils.shouldShowOnGivenDevice(chatWidget) &&
  shouldShowOnThisPage(chatWidget)) {
    const buttonConfiguration = getChatButtonConfigs(chatWidget)

    // store's local time in required payload format
    const storeTime = utils.getStoresLocalTime(kiboBasicSetup.storeInfo.timezone)

    const chatWidgetComponent = showChatWidget(chatWidget, buttonConfiguration, storeTime)

    showCallOut(chatWidget, chatWidgetComponent)
  }
}

function showChatWidget (chatWidget, buttonConfiguration, storeLocalTime) {
  const widgetPosition = utils.getPositionBasedOnDevice(chatWidget)
  const widgetHeight = utils.getHeightBasedOnDevice(chatWidget)
  const widgetEdge = utils.getEdgeBasedOnDevice(chatWidget)

  const storeOpen = utils.isSupportOpen(storeLocalTime, chatWidget.onOffHours)

  const startEndTime = {
    startTime: chatWidget.onOffHours[storeLocalTime.day].startTime,
    endTime: chatWidget.onOffHours[storeLocalTime.day].endTime
  }

  let offlineStoreMsg = chatWidget
    .greetingsWidget.offlineStoreMsg.replace('<start time>', startEndTime.startTime)
    .replace('<end time>', startEndTime.endTime)

  const agents = filterAvailableAgents(chatWidget, storeLocalTime)

  const content = kiboContent.chatWidget(widgetPosition, chatWidget.greetingsWidget.titleText,
    chatWidget.greetingsWidget.helpText,
    offlineStoreMsg, chatWidget.greetingsWidget.offlineAgentMsg, agents, storeOpen)

  const styling = kiboChatWidgetStyle(
    chatWidget.greetingsWidget.headingColor,
    chatWidget.greetingsWidget.descriptionColor,
    chatWidget.greetingsWidget.backgroundColorStyle,
    chatWidget.greetingsWidget.backgroundColor1,
    chatWidget.greetingsWidget.backgroundColor2,
    widgetHeight,
    widgetEdge
  )

  const eventObjects = [
    {
      eventName: 'click',
      emitterId: 'kibochat-widget-close-btn',
      handlerFunc: function (e) {
        e.preventDefault()
        this.hideWidget()
      }
    },
    {
      eventName: 'click',
      emitterId: 'kibochat-widget-footer',
      handlerFunc: function (e) {
        e.preventDefault()
        window.open('https://kibopush.com')
      }
    }
  ]

  const agentItemsEvent = {
    eventName: 'click',
    emitterClass: '.kibochat-agent-item',
    handlerFunc: function (agentElem, e) {
      e.preventDefault()

      const whatsappNumber = agentElem.dataset.whatsappNumber
      const includePageUrl = chatWidget.textMessage.includePageURL
      const customerMsg = chatWidget.textMessage.message

      window.open(formulateWhatsAppUrl(whatsappNumber, customerMsg, includePageUrl))
    }
  }

  const kiboChatWidget = new KiboChat({
    content,
    styling,
    eventObjects,
    buttonConfiguration,
    agentItemsEvent
  })

  kiboChatWidget.build()

  return kiboChatWidget
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

function showCallOut (chatWidget, kiboChatWidget) {
  if (chatWidget.callOutCard.enabled) {
    if (!utils.cookieExists('kiboCallOutSeen')) {
      kiboChatWidget.showCallOut()
      utils.setCookie('kiboCallOutSeen', true, 1)
    }
  }
}

function getChatButtonConfigs (chatWidget) {
  const widgetPosition = utils.getPositionBasedOnDevice(chatWidget)
  const widgetHeight = utils.getHeightBasedOnDevice(chatWidget)
  const widgetEdge = utils.getEdgeBasedOnDevice(chatWidget)

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

  const kiboButtonConfigurations = {
    btnContent: content,
    btnStyling: styling,
    callOutContent: popupContent,
    callOutStyling: popupStyling,
    callOutDelay: popupDelay,
    emitterId: 'kiboChatBtn'
  }

  return kiboButtonConfigurations
}

function formulateWhatsAppUrl (number, txtMessage, includePageUrl) {
  const pageUrl = window.location.href
  let url = ''

  if (includePageUrl) {
    url = 'https://wa.me/' + number + '?text=' + utils.fixedEncodeURIComponent('' + pageUrl + '\n\n' + txtMessage)
  } else {
    url = 'https://wa.me/' + number + '?text=' + utils.fixedEncodeURIComponent('' + txtMessage)
  }

  return url
}

function randomizeAgentsOrder (agents) {
  const tempAgents = [...agents]
  tempAgents
    .sort(() => Math.random() - 0.5)
  return tempAgents
}

function filterAvailableAgents (chatWidget, storeLocalTime) {
  const agents = (chatWidget.greetingsWidget.randomAgentsOrder)
    ? randomizeAgentsOrder(chatWidget.agents)
    : chatWidget.agents

  const availableAgents = []

  for (let i = 0; i < agents.length; i++) {
    if (agents[i].enabled &&
      utils.isSupportOpen(storeLocalTime, agents[i].onlineHours)) {
      availableAgents.push(agents[i])
    }
  }

  return availableAgents
}

exports.initChatButtonWidget = initChatButtonWidget
