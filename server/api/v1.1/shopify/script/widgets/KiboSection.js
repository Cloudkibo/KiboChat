/**
 * SECTION DIV TEMPLATE
 *
 * This may serve as a section between page body to contain
 * it's own content. It should be sibling of any existing
 * section or portion on HTML document.
 *
 * - Sojharo
 */

// Define our constructor
function KiboSection () {
  // Create global element references
  this.kibosection = null

  // Define option defaults
  let defaults = {
    className: 'fade-and-drop',
    siblingClass: '', // sibling element beside which this section is added
    content: '',
    styling: '', // css styling should come externally to make it reusable
    eventObjects: [] // letting user define events and their logic externally
  }

  // Create options by extending defaults with the passed in arugments
  if (arguments[0] && typeof arguments[0] === 'object') {
    this.options = extendDefaults(defaults, arguments[0])
  }
}

// Public Methods

KiboSection.prototype.build = function () {
  // Build out our Button
  buildOut.call(this)

  /*
   * After adding elements to the DOM, use getComputedStyle
   * to force the browser to recalc and recognize the elements
   * that we just added. This is so that CSS animation has a start point
   */
  window.getComputedStyle(this.kibosection)
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
  this.kibosection = document.createElement('div')
  this.kibosection.innerHTML = content
  this.kibosection = this.kibosection.firstElementChild

  // Append kibobutton to DocumentFragment
  docFrag.appendChild(this.kibosection)

  // Getting reference to sibbling element
  const siblingElement = document.querySelector(`.${this.option.siblingClass}`)

  // Insert the new node after the sibling node
  siblingElement.after(docFrag)

  // Append DocumentFragment to body
  // document.body.appendChild(docFrag)

  // Append external style given by user
  if (this.options.styling) {
    let style = document.createElement('style')
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
}

exports.KiboSection = KiboSection
