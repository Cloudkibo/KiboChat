(function () {
  /**
   * MODAL PLUGIN TEMPLATE - This IIFE is generic implementation of Modal Plugin which
   * can be used as Opt-in Modal work in our case as well.
   */
  (function () {
  // Define our constructor
    this.KiboModal = function () {
    // Create global element references
      this.closeButton = null
      this.modal = null
      this.overlay = null

      // Determine proper prefix
      this.transitionEnd = transitionSelect()

      // Define option defaults
      var defaults = {
        className: 'fade-and-drop',
        closeButton: true,
        content: '',
        maxWidth: 600,
        minWidth: 280,
        overlay: true,
        styling: '', // css styling should come externally to make it reusable
        customEventObjectId: '',
        customEventHandler: null
      }

      // Create options by extending defaults with the passed in arugments
      if (arguments[0] && typeof arguments[0] === 'object') {
        this.options = extendDefaults(defaults, arguments[0])
      }
    }

    // Public Methods

    this.KiboModal.prototype.open = function () {
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

    this.KiboModal.prototype.close = function () {
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
        content = this.options.content
      } else {
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

      if (this.options.styling) {
        var style = document.createElement('style')
        style.type = 'text/css'
        style.innerHTML = this.options.styling
        document.getElementsByTagName('head')[0].appendChild(style)
      }

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
  }())

  /**
   * STARTING POINT
   */
  const kiboCompanyId = window.__kibocompany__
  const kiboDomain = window.__kibodomain__
  const kiboShopifyId = window.__kiboshopifyId__

  const urlForBasicSetup = `${kiboDomain}/api/supernumber/fetchWidgetInfo`
  const urlForSubmission = `${kiboDomain}/api/supernumber/storeOptinNumberFromWidget`

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
        initOptinWidget(kiboBasicSetup)
      }
    }
  }

  function initOptinWidget ({optin_widget: optinWidget, ...kiboBasicSetup}) {
    console.log('optinWidget', optinWidget)
    console.log('kiboBasicSetup', kiboBasicSetup)
    setTimeout(() => {
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
            const kiboResponse = JSON.parse(HttpForOptinSubmission.responseText)
            console.log('FORM SUBMITTED')
          }
        }

        this.close()
      }

      let kiboModal = new this.KiboModal({
        content: kiboContent.optinWidget[optinWidget.language],
        styling: kiboOptinModalStyle,
        customEventObjectId: 'kibo-optin-form',
        customEventHandler: processOptinSubmission
      })
      kiboModal.open()
    }, 1000)
  }

  /**
   * CONTENT RESOURCES BASED ON LANGUAGES
   */

  const kiboContent = {
    optinWidget: {
      english: `
      <center>
        <img src="https://cdn.cloudkibo.com/public/icons/whatsappIcon.png" width=100 height=100 />
        <h2>Receive updates on WhatsApp</h2>
        <ul id="kibo-optin-list">
          <li>Order details</li>
          <li>Delivery updates</li>
          <li>Customer support</li>
        </ul>
      </center>
      <form id='kibo-optin-form'>
        <label for="name">First Name</label>
        <input type="text" id="name" name="name" placeholder="John Doe" class='kibo-otpin-text-input'>
        <label for="contactNumber">WhatsApp Number</label>
        <input type="text" id="contactNumber" name="contactNumber" placeholder="+923..." class='kibo-otpin-text-input'>
        <input type="submit" value="Submit" class='kibo-otpin-submit-input'>
      </form>
      `,
      arabic: `
      <center>
        <img src="https://cdn.cloudkibo.com/public/icons/whatsappIcon.png" width=100 height=100 />
        <h2>تلقي التحديثات على الواتس اب</h2>
        <ul id="kibo-optin-list" dir=rtl>
          <li>تفاصيل الطلب</li>
          <li>تحديثات التسليم</li>
          <li>دعم العملاء</li>
        </ul>
      </center>
      <form id='kibo-optin-form' dir=rtl>
        <label for="name">اسم</label>
        <input type="text" id="name" name="name" placeholder="أكرم" class='kibo-otpin-text-input'>
        <label for="contactNumber">رقم الواتس اب</label>
        <input type="text" id="contactNumber" name="contactNumber" placeholder="+923..." class='kibo-otpin-text-input' dir=ltr>
        <input type="submit" value="Submit" class='kibo-otpin-submit-input'>
      </form>
      `,
      urdu: `
      <center>
        <img src="https://cdn.cloudkibo.com/public/icons/whatsappIcon.png" width=100 height=100 />
        <h2>واٹس ایپ پر اپ ڈیٹس وصول کریں</h2>
        <ul id="kibo-optin-list" dir=rtl>
          <li>آرڈر کی تفصیلات</li>
          <li>ڈلیوری اپ ڈیٹس</li>
          <li>کسٹمر سپورٹ</li>
        </ul>
      </center>
      <form id='kibo-optin-form' dir=rtl>
        <label for="name">نام</label>
        <input type="text" id="name" name="name" placeholder="جان اکرم" class='kibo-otpin-text-input'>
        <label for="contactNumber">واٹس ایپ نمبر</label>
        <input type="text" id="contactNumber" name="contactNumber" placeholder="+923..." class='kibo-otpin-text-input' dir=ltr>
        <input type="submit" value="Submit" class='kibo-otpin-submit-input'>
      </form>
      `
    }
  }

  /**
   * COSMETICS RESOURCES
   */

  const kiboOptinModalStyle = `
  .kibo-optin-overlay
  {
      position: fixed;
      z-index: 9998;
      top: 0;
      left: 0;
  
      opacity: 0;
  
      width: 100%;
      height: 100%;
  
      -webkit-transition: 1ms opacity ease;
         -moz-transition: 1ms opacity ease;
          -ms-transition: 1ms opacity ease;
           -o-transition: 1ms opacity ease;
              transition: 1ms opacity ease;
  
      background: rgba(0,0,0,.6);
  }
  
  .kibo-optin-modal
  {
      position: absolute;
      z-index: 9999;
      top: 50%;
      left: 50%;
  
      opacity: 0;
  
      width: 94%;
      padding: 24px 20px;
  
      -webkit-transition: 1ms opacity ease;
         -moz-transition: 1ms opacity ease;
          -ms-transition: 1ms opacity ease;
           -o-transition: 1ms opacity ease;
              transition: 1ms opacity ease;
  
      -webkit-transform: translate(-50%, -50%);
         -moz-transform: translate(-50%, -50%);
          -ms-transform: translate(-50%, -50%);
           -o-transform: translate(-50%, -50%);
              transform: translate(-50%, -50%);
  
      border-radius: 2px;
      background: #fff;
  }
  
  .kibo-optin-modal.kibo-optin-open.kibo-optin-anchored
  {
      top: 20px;
  
      -webkit-transform: translate(-50%, 0);
         -moz-transform: translate(-50%, 0);
          -ms-transform: translate(-50%, 0);
           -o-transform: translate(-50%, 0);
              transform: translate(-50%, 0);
  }
  
  .kibo-optin-modal.kibo-optin-open
  {
      opacity: 1;
  }
  
  .kibo-optin-overlay.kibo-optin-open
  {
      opacity: 1;
  
  }
  
  /* Close Button */
  .kibo-optin-close
  {
      font-family: Helvetica,Arial,sans-serif;
      font-size: 24px;
      font-weight: 700;
      line-height: 12px;
  
      position: absolute;
      top: 5px;
      right: 5px;
  
      padding: 5px 7px 7px;
  
      cursor: pointer;
  
      color: #fff;
      border: 0;
      outline: none;
      background: #e74c3c;
  }
  
  .kibo-optin-close:hover
  {
      background: #c0392b;
  }
  /* Default Animation */

  .kibo-optin-overlay.fade-and-drop
  {
      display: block;

      opacity: 0;
  }

  .kibo-optin-modal.fade-and-drop
  {
      top: -300%;

      opacity: 1;

      display: block;
  }

  .kibo-optin-modal.fade-and-drop.kibo-optin-open
  {
      top: 50%;

      -webkit-transition: 500ms top 500ms ease;
        -moz-transition: 500ms top 500ms ease;
          -ms-transition: 500ms top 500ms ease;
          -o-transition: 500ms top 500ms ease;
              transition: 500ms top 500ms ease;
  }

  .kibo-optin-modal.fade-and-drop.kibo-optin-open.kibo-optin-anchored
  {

      -webkit-transition: 500ms top 500ms ease;
        -moz-transition: 500ms top 500ms ease;
          -ms-transition: 500ms top 500ms ease;
          -o-transition: 500ms top 500ms ease;
              transition: 500ms top 500ms ease;
  }

  .kibo-optin-overlay.fade-and-drop.kibo-optin-open
  {
      top: 0;

      -webkit-transition: 500ms opacity ease;
        -moz-transition: 500ms opacity ease;
          -ms-transition: 500ms opacity ease;
          -o-transition: 500ms opacity ease;
              transition: 500ms opacity ease;

      opacity: 1;
  }

  .kibo-optin-modal.fade-and-drop
  {
      -webkit-transition: 500ms top ease;
        -moz-transition: 500ms top ease;
          -ms-transition: 500ms top ease;
          -o-transition: 500ms top ease;
              transition: 500ms top ease;
  }

  .kibo-optin-overlay.fade-and-drop
  {
      -webkit-transition: 500ms opacity 500ms ease;
        -moz-transition: 500ms opacity 500ms ease;
          -ms-transition: 500ms opacity 500ms ease;
          -o-transition: 500ms opacity 500ms ease;
              transition: 500ms opacity 500ms ease;
  }

  .kibo-otpin-text-input {
    width: 100%;
    padding: 12px 20px;
    margin: 8px 0;
    display: inline-block;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  }
  
  .kibo-otpin-submit-input {
    width: 100%;
    background-color: #4CAF50;
    color: white;
    padding: 14px 20px;
    margin: 8px 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .kibo-otpin-submit-input:hover {
    background-color: #45a049;
  }

  #kibo-optin-list {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }

  #kibo-optin-list li {
    display: inline;
    padding: 10px;
  }
  `
}())
