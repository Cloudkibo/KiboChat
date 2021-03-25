/**
 * STARTING POINT
 *
 * The main script code starts from here.
 */

const Optin = require('./optin')
const Share = require('./share')
const Chat = require('./chat')

const kiboCompanyId = window.__kibocompany__
const kiboDomain = window.__kibodomain__
const kiboShopifyId = window.__kiboshopifyId__

const urlForBasicSetup = `${kiboDomain}/api/supernumber/fetchWidgetInfo`

// Going to fetch basic super number preferences of merchant from server
const HttpForBasicSetup = new XMLHttpRequest()
HttpForBasicSetup.open('POST', urlForBasicSetup)
HttpForBasicSetup.setRequestHeader('Content-Type', 'application/json')
HttpForBasicSetup.send(JSON.stringify({
  companyId: kiboCompanyId, shopifyId: kiboShopifyId
}))

HttpForBasicSetup.onreadystatechange = function (e) {
  if (this.readyState === 4 && this.status === 200) {
    const kiboResponse = JSON.parse(HttpForBasicSetup.responseText)
    const kiboBasicSetup = kiboResponse.payload
    if (kiboBasicSetup.optin_widget.enabled) {
      Optin.initOptinWidget(kiboBasicSetup)
    }
    if (kiboBasicSetup.share_button.enabled) {
      Share.initShareButtonWidget(kiboBasicSetup)
    }
    if (kiboBasicSetup.chat_widget.enabled) {
      Chat.initChatButtonWidget(kiboBasicSetup)
    }
  }
}
