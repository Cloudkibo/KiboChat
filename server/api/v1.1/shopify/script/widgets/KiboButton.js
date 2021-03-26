/**
 * SHARE BUTTON TEMPLATE
 *
 * - Sojharo
 */

// Define our constructor
function KiboButton () {
  // Create global element references
  this.kibobutton = null
  this.popup = null

  // Define option defaults
  let defaults = {
    className: 'fade-and-drop',
    content: '',
    styling: '', // css styling should come externally to make it reusable
    hasPopup: false,
    popupContent: '', // the popup should contain one button element to close it
    popupStyling: '',
    popupDelay: 5,
    eventObjects: [] // letting user define events and their logic externally
  }

  // Create options by extending defaults with the passed in arugments
  if (arguments[0] && typeof arguments[0] === 'object') {
    this.options = extendDefaults(defaults, arguments[0])
  }
}

// Public Methods

KiboButton.prototype.build = function () {
  // Build out our Button
  buildOut.call(this)

  // Initialize our event listeners
  initializeEvents.call(this)

  /*
   * After adding elements to the DOM, use getComputedStyle
   * to force the browser to recalc and recognize the elements
   * that we just added. This is so that CSS animation has a start point
   */
  window.getComputedStyle(this.kibobutton).height
}

KiboButton.prototype.showButton = function () {
  this.kibobutton.style.display = 'block'
  this.kibobutton.style.visibility = 'visible'
}

KiboButton.prototype.hideButton = function () {
  this.kibobutton.style.display = 'none'
  this.kibobutton.style.visibility = 'hidden'
}

KiboButton.prototype.showPopup = function () {
  setTimeout(() => {
    this.kibobutton.style.display = 'block'
    this.popup.style.visibility = 'visible'
    this.popup.style.opacity = 1
  }, (this.options.popupDelay * 1000))
}

KiboButton.prototype.hidePopup = function () {
  this.kibobutton.style.display = 'none'
  this.popup.style.visibility = 'hidden'
  this.popup.style.opacity = 0
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
   * Getting the inner content of given button
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
  this.kibobutton = document.createElement('div')
  this.kibobutton.innerHTML = content
  this.kibobutton = this.kibobutton.firstElementChild

  if (this.options.hasPopup) {
    this.popup = document.createElement('div')
    this.popup.innerHTML = this.options.popupContent
    this.popup = this.popup.firstElementChild

    this.kibobutton.appendChild(this.popup)
  }

  // Append kibobutton to DocumentFragment
  docFrag.appendChild(this.kibobutton)

  // Append DocumentFragment to body
  document.body.appendChild(docFrag)

  // Append external style given by user
  if (this.options.styling) {
    let style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = this.options.styling
    document.getElementsByTagName('head')[0].appendChild(style)
  }

  // Append external style given by user to popup if available
  if (this.options.hasPopup && this.options.popupStyling) {
    let style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = this.options.popupStyling
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
}

function initializeEvents () {
  if (this.popup) {
    this.popup
      .querySelectorAll('button')[0]
      .addEventListener('click', this.hidePopup.bind(this))
  }
}

exports.KiboButton = KiboButton
