/**
 * CONTENT RESOURCES BASED ON LANGUAGES
 *
 * This will contain the html body templates of the widgets
 * such as optin widget, share button and whatsapp chat plugin.
 *
 * - Sojharo
 */

exports.kiboContent = {
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
  },
  shareButton: function (btnText, position, txtMessage) {
    return `
    <div class='kiboshare-btns-container kiboshare-btns-${position}'>
      <div class='social-kiboshare-btns'>
        <a id='kiboShareBtn' class='kiboshare-btn kiboshare-btn-mail' rel='nofollow' target='_blank'>
          <i class='ion-social-whatsapp'></i>
          ${btnText}
        </a>
      </div>
    </div>
    `
  },
  chatButton: function (btnText, position) {
    return `
    <div class='kibochat-btns-container kibochat-btns-${position}'>
      <div class='social-kibochat-btns'>
        <a id='kiboChatBtn' class='kibochat-btn kibochat-btn-mail' rel='nofollow' target='_blank'>
          <i class='ion-social-whatsapp'></i>
          ${btnText}
        </a>
      </div>
    </div>
    `
  },
  chatPopup: function (callOutMessage, position) {
    return `
    <span class="kibo-call-out kibo-call-out-${position}">${callOutMessage}
      <button class='kibo-call-out-close'>x</button>
    </span>
    `
  },
  chatWidget: function (position, titleText, helpText, offlineMsg, agents, storeOpen) {
    const firstPart = `
    <div class='kibochat-widget-wrapper kibochat-widget-wrapper-${position}'>
    <div class='kibochat-widget-header'>
      <button id='kibochat-widget-close-btn' class='kibochat-widget-close'>x</button>
      <div class='kibochat-widget-header-title'>
        ${titleText}
      </div>
      <div class='kibochat-widget-header-desc'>
        ${storeOpen ? helpText : offlineMsg}
      </div>
    </div>
    <ul class='kibochat-agent-list'>
    `

    let middlePart = ''

    if (storeOpen) {
      for (let i = 0; i < agents.length; i++) {
        middlePart += `
        <li data-whatsapp-number='${agents[i].whatsappNumber}' class='kibochat-agent-item'>
          <div class='kibochat-agent-item-content'>
            <h4>${agents[i].agentName}</h4>
            <p>${agents[i].agentRole}</p>
          </div>
        </li>
        `
      }
    }

    const lastPart = `
    </ul>
    <div class='kibochat-widget-footer'>
      <span style='vertical-align: middle;'>
        Powered by 
        <span style='color: #2EB840;'>
          KiboPush
        </span>
      </span>
    </div>
  </div>
    `

    return `${firstPart} ${middlePart} ${lastPart}`

  //   return `
  //   <div class='kibochat-widget-wrapper kibochat-widget-wrapper-${position}'>
  //   <div class='kibochat-widget-header'>
  //     <button id='kibochat-widget-close-btn' class='kibochat-widget-close'>x</button>
  //     <div class='kibochat-widget-header-title'>
  //       ${titleText}
  //     </div>
  //     <div class='kibochat-widget-header-desc'>
  //       ${helpText}
  //     </div>
  //   </div>
  //   <ul class='kibochat-agent-list'>
  //     <!--<li class='kibochat-agent-item'>
  //       <div class='kibochat-agent-item-content'>
  //         <h4>Sojharo Mangi</h4>
  //         <p>Customer Support</p>
  //       </div>
  //     </li>
  //     <li class='kibochat-agent-item'>
  //       <div class='kibochat-agent-item-content'>
  //         <h4>Ansa Sojharo</h4>
  //         <p>Sales Manager</p>
  //       </div>
  //     </li>
  //     <li class='kibochat-agent-item'>
  //       <div class='kibochat-agent-item-content'>
  //         <h4>Imran Shoukat</h4>
  //         <p>Customer Support</p>
  //       </div>
  //     </li>-->
  //   </ul>
  //   <div class='kibochat-widget-footer'>
  //     <span style='vertical-align: middle;'>
  //       Powered by
  //       <span style='color: #2EB840;'>
  //         KiboPush
  //       </span>
  //     </span>
  //   </div>
  // </div>
  //   `
  }
}
