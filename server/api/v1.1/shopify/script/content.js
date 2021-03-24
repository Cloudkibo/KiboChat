/**
 * CONTENT RESOURCES BASED ON LANGUAGES
 *
 * This will contain the html body templates of the widgets
 * such as optin widget, share button and whatsapp chat plugin.
 *
 * - Sojharo
 */

const { fixedEncodeURIComponent } = require('./utils')

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
    const pageUrl = window.location.href
    let url = ''

    if (txtMessage) {
      url = 'https://wa.me/?text=' + fixedEncodeURIComponent('' + pageUrl + '\n\n' + txtMessage)
    } else {
      url = 'https://wa.me/?text=' + fixedEncodeURIComponent('' + pageUrl)
    }

    return `
    <div class='kiboshare-btns-container kiboshare-btns-${position}'>
      <div class='social-kiboshare-btns'>
        <a class='kiboshare-btn kiboshare-btn-mail' href='${url}' rel='nofollow' target='_blank'>
          <i class='ion-social-whatsapp'></i>
          ${btnText}
        </a>
      </div>
    </div>
    `
  }
}
