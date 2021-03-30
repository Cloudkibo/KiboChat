const KiboButton = require('./widgets/KiboButton').KiboButton
const utils = require('./utils')
const { fixedEncodeURIComponent } = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboShareButtonStyle = require('./styling').kiboShareButtonStyle

function initShareButtonWidget ({share_button: shareButton, ...kiboBasicSetup}) {
  const widgetPosition = utils.getPositionBasedOnDevice(shareButton)

  if (utils.shouldShowOnGivenDevice(shareButton) &&
  utils.shouldShowOnThisPage(shareButton)) {
    const content = kiboContent.shareButton(shareButton.textMessage.btnText,
      widgetPosition)

    const styling = kiboShareButtonStyle(
      shareButton.btnDesign.iconColor,
      shareButton.btnDesign.btnTextColor,
      shareButton.btnDesign.backgroundColorStyle,
      shareButton.btnDesign.backgroundColor1,
      shareButton.btnDesign.backgroundColor2
    )

    const eventObjects = [
      {
        eventName: 'click',
        emitterId: 'kiboShareBtn',
        handlerFunc: function (e) {
          e.preventDefault()

          utils.storeClickCount('share')

          window.open(formulateWhatsAppUrl(shareButton.textMessage.message))
        }
      }
    ]

    let kiboButton = new KiboButton({
      content,
      styling,
      eventObjects
    })

    kiboButton.build()
  }
}

function formulateWhatsAppUrl (txtMessage) {
  const pageUrl = window.location.href
  let url = ''

  if (txtMessage) {
    url = 'https://wa.me/?text=' + fixedEncodeURIComponent('' + pageUrl + '\n\n' + txtMessage)
  } else {
    url = 'https://wa.me/?text=' + fixedEncodeURIComponent('' + pageUrl)
  }

  return url
}

exports.initShareButtonWidget = initShareButtonWidget
