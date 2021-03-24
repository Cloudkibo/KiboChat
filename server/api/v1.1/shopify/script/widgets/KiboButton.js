/**
 * SHARE BUTTON TEMPLATE
 *
 * - Sojharo
 */

// Define our constructor
function KiboButton () {
  // Create global element references
  this.kibobutton = null

  // Define option defaults
  let defaults = {
    className: 'fade-and-drop',
    content: '',
    styling: '' // css styling should come externally to make it reusable
  }

  // Create options by extending defaults with the passed in arugments
  if (arguments[0] && typeof arguments[0] === 'object') {
    this.options = extendDefaults(defaults, arguments[0])
  }
}

// Public Methods

KiboButton.prototype.show = function () {
  // Build out our Button
  buildOut.call(this)

  /*
   * After adding elements to the DOM, use getComputedStyle
   * to force the browser to recalc and recognize the elements
   * that we just added. This is so that CSS animation has a start point
   */
  window.getComputedStyle(this.kibobutton).height
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
  // this.kibobutton.className = 'kibo-optin-kibobutton ' + this.options.className

  // Append kibobutton to DocumentFragment
  docFrag.appendChild(this.kibobutton)

  // Append DocumentFragment to body
  document.body.appendChild(docFrag)

  if (this.options.styling) {
    var style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = this.options.styling
    document.getElementsByTagName('head')[0].appendChild(style)
  }
}

exports.KiboButton = KiboButton
