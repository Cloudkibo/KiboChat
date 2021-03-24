/**
 * COSMETICS RESOURCES
 *
 * This contains the css styles used inside our widgets.
 * As JavaScript widget is a single js file it is not possible
 * to have separate stylesheet files. Therefore, they will be exported
 * from this file and attached to html page dynamically with help of
 * JavaScript.
 *
 * - Sojharo
 */

exports.kiboOptinModalStyle = `
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

exports.kiboShareButtonStyle = function (iconClr, btnTxtClr, bgStyle, bg1, bg2) {
  return `
  @import url(https://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css);
  a {
    text-decoration: none;
  }
  
  .kiboshare-btns-container {
    overflow: hidden;
    position: fixed;
    font-size: 0;
    top: 50%;
    width: 100%;
    height: 36px;
    z-index: 111;
    transform-origin: 0% 0%;
    -webkit-transform: rotate(-90deg);
       -moz-transform: rotate(-90deg);
        -ms-transform: rotate(-90deg);
         -o-transform: rotate(-90deg);
            transform: rotate(-90deg) translateY(-100%);
  }
  
  .kiboshare-btns-left {
    left: 36px;
  }
  
  .kiboshare-btns-right{
    left: 100%;
  }
  
  .social-kiboshare-btns {
    display: inline-block;
    overflow: hidden;
  }
  .social-kiboshare-btns .kiboshare-btn {
    float: left;
    margin: 0 5px;
    padding: 8px 16px;
    border-radius: 3px;
    color: ${btnTxtClr};
    font-size: 18px;
    line-height: 18px;
    vertical-align: middle;
    -moz-transition: background 0.2s ease-in-out;
    -o-transition: background 0.2s ease-in-out;
    -webkit-transition: background 0.2s ease-in-out;
    transition: background 0.2s ease-in-out;
  }
  
  .social-kiboshare-btns .kiboshare-btn i {
    margin-right: 5px;
    display: inline-block;
    font-size: 18px;
    color: ${iconClr};
    vertical-align: middle;
  }
  
  .kiboshare-btn {
    background-color: #95a5a6;
  }
  .kiboshare-btn:hover {
    background-color: #798d8f;
  }
  
  .kiboshare-btn-mail {
    background-color: ${bg1};
    ${bgStyle === 'single'
    ? ''
    : 'background-image: linear-gradient(' + bg1 + ', ' + bg2 + ');'}
  }
  .kiboshare-btn-mail:hover {
    background-color: #dab10d;
  }
  `
}
