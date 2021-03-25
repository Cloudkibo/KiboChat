const KiboButton = require('./widgets/KiboButton').KiboButton
const utils = require('./utils')

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboShareButtonStyle = require('./styling').kiboShareButtonStyle

function initShareButtonWidget ({share_button: shareButton, ...kiboBasicSetup}) {
  const widgetPosition = utils.getPositionBasedOnDevice(shareButton)

  if (utils.shouldShowOnGivenDevice(shareButton) &&
  utils.shouldShowOnThisPage(shareButton)) {
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

exports.initShareButtonWidget = initShareButtonWidget
