const KiboModal = require('./widgets/KiboModal').KiboModal

// Import content for the widget body
const kiboContent = require('./content').kiboContent

// Import styling for the widget body
const kiboOptinModalStyle = require('./styling').kiboOptinModalStyle

const kiboCompanyId = window.__kibocompany__
const kiboDomain = window.__kibodomain__
const urlForSubmission = `${kiboDomain}/api/supernumber/storeOptinNumberFromWidget`

function initOptinWidget ({optin_widget: optinWidget, ...kiboBasicSetup}) {
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
        console.log('optin received.')
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

exports.initOptinWidget = initOptinWidget
