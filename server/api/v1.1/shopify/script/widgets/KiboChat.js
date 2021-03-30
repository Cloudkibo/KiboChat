const KiboButton = require('./KiboButton').KiboButton
/**
 * CHAT PLUGIN TEMPLATE
 *
 * - Sojharo
 */

// Define our constructor
function KiboChat () {
  // Create global element references
  this.chatButton = null
  this.chatWidget = null

  // Define option defaults
  let defaults = {
    className: 'fade-and-drop',
    content: '',
    styling: '', // css styling should come externally to make it reusable
    buttonConfiguration: {}, // Button configuration is based on KiboButton.js
    agentItemsEvent: null, // this event will tie to each agent item in chat widget
    eventObjects: [] // letting user define events and their logic externally
  }

  // Create options by extending defaults with the passed in arugments
  if (arguments[0] && typeof arguments[0] === 'object') {
    this.options = extendDefaults(defaults, arguments[0])
  }
}

// Public Methods

KiboChat.prototype.build = function () {
  // Build out our Chat Widget
  buildOut.call(this)
  buildOutButton.call(this)

  /*
   * After adding elements to the DOM, use getComputedStyle
   * to force the browser to recalc and recognize the elements
   * that we just added. This is so that CSS animation has a start point
   */
  window.getComputedStyle(this.chatWidget)
}

KiboChat.prototype.showWidget = function () {
  this.chatWidget.style.display = 'block'
  this.chatWidget.style.visibility = 'visible'
}

KiboChat.prototype.hideWidget = function () {
  this.chatWidget.style.display = 'none'
  this.chatWidget.style.visibility = 'hidden'
  this.chatButton.showButton()
}

KiboChat.prototype.showCallOut = function () {
  this.chatButton.showPopup()
}

KiboChat.prototype.hideCallOut = function () {
  this.chatButton.hidePopup()
}

// Private Methods

// Utility method to extend defaults with user options
function extendDefaults (source, properties) {
  var property
  for (property in properties) {
    if (properties.hasOwnProperty(property)) {
      source[property] = properties[property]
    }
  }
  return source
}

function buildOut () {
  var content, docFrag

  /*
   * Getting the inner content of given chat widget
   */

  // not doing this right now, will do when opera mini
  // and safari iOS supports DOM parsing properly with
  // text/html argument.
  // See: https://stackoverflow.com/questions/3103962/converting-html-string-into-dom-elements
  // - Sojharo
  // content = this.options.content.innerHTML

  content = this.options.content // see above comment why we are not doing innerHtml here

  // Create a DocumentFragment to build with
  docFrag = document.createDocumentFragment()

  // Create kibobutton element
  this.chatWidget = document.createElement('div')
  this.chatWidget.innerHTML = content
  this.chatWidget = this.chatWidget.firstElementChild

  // Append kibobutton to DocumentFragment
  docFrag.appendChild(this.chatWidget)

  // Append DocumentFragment to body
  document.body.appendChild(docFrag)

  // Append external style given by user
  if (this.options.styling) {
    var style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = this.options.styling
    document.getElementsByTagName('head')[0].appendChild(style)
  }

  // if external events are defined by user, attach the given handlers to
  // their respective event emitters
  if (this.options.eventObjects && this.options.eventObjects.length > 0) {
    for (let i = 0; i < this.options.eventObjects.length; i++) {
      const eventObject = this.options.eventObjects[i]
      if (eventObject.emitterId && eventObject.handlerFunc && eventObject.eventName) {
        const customEventObject = document.getElementById(eventObject.emitterId)

        customEventObject.addEventListener(eventObject.eventName, eventObject.handlerFunc.bind(this))
      } else {
        console.error('Event object must contain emitterId, handlerFunc and eventName')
      }
    }
  }

  if (this.options.agentItemsEvent && typeof this.options.agentItemsEvent === 'object') {
    const eventObject = this.options.agentItemsEvent
    const agentElems = this.chatWidget.querySelectorAll(this.options.agentItemsEvent.emitterClass)
    for (let i = 0; i < agentElems.length; i++) {
      agentElems[i].addEventListener(eventObject.eventName, eventObject.handlerFunc.bind(this, agentElems[i]))
    }
  }
}

function buildOutButton () {
  const {
    btnContent,
    btnStyling,
    callOutContent,
    callOutStyling,
    callOutDelay,
    emitterId
  } = this.options.buttonConfiguration

  // Main button content
  const content = btnContent

  // Main button styling
  const styling = btnStyling

  // Main button content
  const popupContent = callOutContent

  // Button popup (callout) styling
  const popupStyling = callOutStyling

  // Deail after which call out should display over button
  const popupDelay = callOutDelay

  // Getting reference of this to use inside Button widget
  const _ = this

  const eventObjects = [
    {
      eventName: 'click',
      emitterId: emitterId,
      handlerFunc: function (e) {
        e.preventDefault()

        // TODO When analytics endpoint is done
        // add the logic to increase click count
        // on server side, when this is clicked
        this.hideButton()
        this.hidePopup()
        _.showWidget()
      }
    }
  ]

  const kiboButton = new KiboButton({
    content,
    styling,
    hasPopup: true,
    popupContent,
    popupStyling,
    popupDelay,
    eventObjects
  })

  this.chatButton = kiboButton
  // showCallOut(chatWidget, kiboButton)

  this.chatButton.build()
}

exports.KiboChat = KiboChat
