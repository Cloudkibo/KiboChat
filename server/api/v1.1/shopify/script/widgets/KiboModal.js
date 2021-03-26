/**
 * MODAL PLUGIN TEMPLATE
 *
 * This module is generic implementation of Modal Plugin which
 * can be used as Opt-in Modal work in our case as well. This
 * is created in a generic fashion that it can have dynamic content
 * i.e. either text or html body.
 *
 * In case of HTML content, we can import one external event topic
 * and handler for it as well inside the widget from the place where
 * we have setup the widget.
 *
 * The styling is also generic and applied externally so that we can
 * easily change the styling from outside.
 *
 * - Sojharo
 */

// Define our constructor
function KiboModal () {
  // Create global element references
  this.closeButton = null
  this.modal = null
  this.overlay = null

  // Determine proper prefix
  this.transitionEnd = transitionSelect()

  // Define option defaults
  let defaults = {
    className: 'fade-and-drop',
    closeButton: true,
    content: '',
    maxWidth: 600,
    minWidth: 280,
    overlay: true,
    styling: '', // css styling should come externally to make it reusable
    customEventObjectId: '', // external object on which we want to listen event
    customEventHandler: null // event handler for external object given by client
  }

  // Create options by extending defaults with the passed in arugments
  if (arguments[0] && typeof arguments[0] === 'object') {
    this.options = extendDefaults(defaults, arguments[0])
  }
}

// Public Methods

KiboModal.prototype.open = function () {
  // Build out our Modal
  buildOut.call(this)

  // Initialize our event listeners
  initializeEvents.call(this)

  /*
   * After adding elements to the DOM, use getComputedStyle
   * to force the browser to recalc and recognize the elements
   * that we just added. This is so that CSS animation has a start point
   */
  window.getComputedStyle(this.modal).height

  /*
   * Add our open class and check if the modal is taller than the window
   * If so, our anchored class is also applied
   */
  this.modal.className = this.modal.className +
    (this.modal.offsetHeight > window.innerHeight
      ? ' kibo-optin-open kibo-optin-anchored' : ' kibo-optin-open')
  this.overlay.className = this.overlay.className + ' kibo-optin-open'
}

KiboModal.prototype.close = function () {
  // Store the value of this
  var _ = this

  // Remove the open class name
  this.modal.className = this.modal.className.replace(' kibo-optin-open', '')
  this.overlay.className = this.overlay.className.replace(' kibo-optin-open', '')

  /*
   * Listen for CSS transitionend event and then
   * Remove the nodes from the DOM
   */
  this.modal.addEventListener(this.transitionEnd, function () {
    _.modal.parentNode.removeChild(_.modal)
  })
  this.overlay.addEventListener(this.transitionEnd, function () {
    if (_.overlay.parentNode) _.overlay.parentNode.removeChild(_.overlay)
  })
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
  var content, contentHolder, docFrag

  /*
   * If content is an HTML string, append the HTML string.
   * If content is a domNode, append its content.
   */

  if (typeof this.options.content === 'string') {
    // using this for html content as well, see comment
    // in else block to understand more
    content = this.options.content
  } else {
    // not doing this right now, will do when opera mini
    // and safari iOS supports DOM parsing properly with
    // text/html argument.
    // See: https://stackoverflow.com/questions/3103962/converting-html-string-into-dom-elements
    // - Sojharo

    content = this.options.content.innerHTML
  }

  // Create a DocumentFragment to build with
  docFrag = document.createDocumentFragment()

  // Create modal element
  this.modal = document.createElement('div')
  this.modal.className = 'kibo-optin-modal ' + this.options.className
  this.modal.style.minWidth = this.options.minWidth + 'px'
  this.modal.style.maxWidth = this.options.maxWidth + 'px'

  // If closeButton option is true, add a close button
  if (this.options.closeButton === true) {
    this.closeButton = document.createElement('button')
    this.closeButton.className = 'kibo-optin-close close-button'
    this.closeButton.innerHTML = '×'
    this.modal.appendChild(this.closeButton)
  }

  // If overlay is true, add one
  if (this.options.overlay === true) {
    this.overlay = document.createElement('div')
    this.overlay.className = 'kibo-optin-overlay ' + this.options.classname
    docFrag.appendChild(this.overlay)
  }

  // Create content area and append to modal
  contentHolder = document.createElement('div')
  contentHolder.className = 'kibo-optin-content'
  contentHolder.innerHTML = content
  this.modal.appendChild(contentHolder)

  // Append modal to DocumentFragment
  docFrag.appendChild(this.modal)

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
  // their respective objects, here we are only allowing one event and handler
  if (this.options.customEventObjectId && this.options.customEventHandler) {
    const customEventObject = document.getElementById(this.options.customEventObjectId)

    customEventObject.addEventListener('submit', this.options.customEventHandler.bind(this))
  }
}

function initializeEvents () {
  if (this.closeButton) {
    this.closeButton.addEventListener('click', this.close.bind(this))
  }

  if (this.overlay) {
    this.overlay.addEventListener('click', this.close.bind(this))
  }
}

// Utility method to determine which transistionend event is supported
function transitionSelect () {
  var el = document.createElement('div')
  if (el.style.WebkitTransition) return 'webkitTransitionEnd'
  if (el.style.OTransition) return 'oTransitionEnd'
  return 'transitionend'
}

exports.KiboModal = KiboModal
