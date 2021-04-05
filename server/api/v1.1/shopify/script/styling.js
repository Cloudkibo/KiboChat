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
      position: fixed;
      z-index: 9999;
      top: 20%;
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
  a.kiboshare-btn.kiboshare-btn-mail {
    text-decoration: none;
    cursor: pointer;
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

exports.kiboChatButtonStyle = function (iconClr, btnTxtClr, bgStyle, bg1, bg2, wHeight, wEdge) {
  return `
  @import url(https://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css);

  a.kibochat-btn.kibochat-btn-mail {
    text-decoration: none;
    cursor: pointer;
  }

  .kibochat-btns-container {
    overflow: hidden;
    position: fixed;
    font-size: 0;
    bottom: ${wHeight}px;
    width: 100%;
    height: 36px;
    z-index: 111;
    visibility: visible;
    display: block;
  }

  .kibochat-btns-left {
    left: ${wEdge}px;
  }

  .kibochat-btns-right{
    text-align: right;
    right: ${wEdge}px;
  }

  .social-kibochat-btns {
    display: inline-block;
    overflow: hidden;
  }
  .social-kibochat-btns .kibochat-btn {
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

  .social-kibochat-btns .kibochat-btn i {
    margin-right: 5px;
    display: inline-block;
    font-size: 18px;
    color: ${iconClr};
    vertical-align: middle;
  }

  .kibochat-btn {
    background-color: #95a5a6;
  }
  .kibochat-btn:hover {
    background-color: #798d8f;
  }

  .kibochat-btn-mail {
    background-color: ${bg1};
    ${bgStyle === 'single'
    ? ''
    : 'background-image: linear-gradient(90deg, ' + bg1 + ', ' + bg2 + ');'}
  }

  .kibochat-btn-mail:hover {
    background-color: #dab10d;
  }
  `
}

exports.kiboChatPopupStyle = function (wHeight, wEdge) {
  return `
  /* Call out styling */
  .kibo-call-out {
    visibility: hidden;
    position: fixed;
    z-index: 112;
    color: #000;
    bottom: calc(${wHeight}px + 50px);
    padding: 12px;
    width: 250px;
    font-size: 14px;
    border: solid;
    border-radius: 4px;
    border-width: 1px;
    border-color: #737270;
    background: #fcfaf5;
    box-shadow: 4px 4px 4px 1px rgba(102, 100, 96, .2);
    /* Fade in tooltip */
    opacity: 0;
    transition: opacity 0.3s;
    display: none;
  }

  .kibo-call-out-left {
    left: ${wEdge}px;
  }

  .kibo-call-out-right {
    text-align: right;
    right: ${wEdge}px;
  }

  /* for testing purpose to show call out */
  /* .social-kibochat-btn:hover + .kibo-call-out {
    visibility: visible;
    opacity: 1;
  } */

  .kibo-call-out-close {
    font-family: Helvetica,Arial,sans-serif;
    font-size: 20px;
    font-weight: 500;
    line-height: 12px;

    position: absolute;
    top: -12px;
    right: -12px;

    padding: 5px 7px 7px;

    cursor: pointer;

    color: #000;
    border: 1;
    border-radius: 50%;
    outline: none;
    background: #fff;
  }
  `
}

exports.kiboChatWidgetStyle = function (headClr, descClr, bgStyle, bg1, bg2, wHeight, wEdge) {
  return `
  .kibochat-widget-wrapper {
    visibility: hidden;
    z-index: 9999;
    position: fixed;
    overflow: hidden;
    width: 100vw;
    font-family: inherit;
    font-size: 14px;
    bottom: 0px;
    display: none;
  }

  @media screen and (max-width: 425px) {
    .kibochat-widget-wrapper {
      top: 0px;
      left: 0px;
      right: 0px;
    }
  }
  
  @media only screen and (min-width: 426px) {
    .kibochat-widget-wrapper {
      box-shadow: 0 0 30px rgb(0 0 0 / 30%);
      width: 350px;
      bottom: ${wHeight}px;
      border-radius: 8px;
    }

    .kibochat-widget-wrapper-left {
      left: ${wEdge}px;
    }
    
    .kibochat-widget-wrapper-right {
      right: ${wEdge}px;
    }
  }
  
  .kibochat-widget-header {
    padding: 24px;
    text-align: center;
    color: #fff;
    background-color: ${bg1};
    ${bgStyle === 'single'
    ? ''
    : 'background-image: linear-gradient(110.56deg, ' + bg1 + ', ' + bg2 + ');'}
  }
  
  .kibochat-widget-close {
    font-family: Helvetica,Arial,sans-serif;
    font-size: 20px;
    font-weight: 500;
    line-height: 12px;
  
    position: absolute;
    top: 12px;
    right: 12px;
  
    padding: 5px 7px 7px;
  
    cursor: pointer;
  
    color: grey;
    border: 0;
    border-radius: 50%;
    outline: none;
    background: none;
  }
  
  .kibochat-widget-header-title {
    font-family: inherit;
    font-style: normal;
    font-weight: 400;
    font-size: 28px;
    line-height: 100%;
    text-align: left;
    color: ${headClr};
  }
  
  .kibochat-widget-header-desc {
    margin-top: 12px;
    font-family: inherit;
    font-style: normal;
    font-weight: normal;
    font-size: 16px;
    line-height: 100%;
    text-align: left;
    color: ${descClr};
  }
  
  .kibochat-agent-list {
    background: #fff;
    border-radius: 2px;
    list-style: none;
    padding: 0;
    height: calc(100vh - 20px);
    overflow-y: auto;
  }

  @media screen and (min-width: 426px) {
    .kibochat-agent-list {
      height: 400px;
    }
  }
  
  .kibochat-agent-item {
    display: flex;
    margin: 8px;
    overflow: hidden;
    padding-bottom: 5px;
    padding-top: 5px;
    cursor: pointer;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  .kibochat-agent-item:last-child {
    border-bottom: none;
  }
  .kibochat-agent-item-content {
    margin-left: 20px;
  }
  .kibochat-agent-item-content h4, .list-item-content p {
    margin: 0;
  }
  .kibochat-agent-item-content h4 {
    margin-top: 10px;
    font-size: 18px;
  }
  .kibochat-agent-item-content p {
    margin-top: 5px;
    color: #aaa;
  }
  
  .kibochat-widget-footer {
    position: absolute;
    bottom: 0px;
    text-align: center;
    font-family: 'Lato', Open Sans, sans-serif;
    font-style: normal;
    font-weight: normal;
    font-size: 12px;
    color: #999999;
    width: 100%;
    height: 20px;
    background: #FAFAFA;
    vertical-align: middle;
    cursor: pointer;
    z-index: 100;
    box-shadow: 0px 0px 8px rgb(0 0 0 / 8%);
    border-radius: 0px 0px 4px 4px;
  }
  `
}

exports.thankYouPageOptinStyle = function () {
  return `
  .kiboButtonIn {
    width: 300px;
    position: relative;
  }
  
  #kiboWhatsappInput {
    margin: 0px;
    padding: 0px;
    padding-left: 15px;
    width: 100%;
    outline: none;
    height: 30px;
    border-style: solid;
    border-width: 1px;
    border-radius: 5px;
  }
  
  #kiboWhatsappOptinBtn {
    position: absolute;
    top: 0;
    border-radius: 5px;
    padding-right: 15px;
    padding-left: 15px;
    right: 1px;
    z-index: 2;
    border: none;
    top: 1px;
    height: 30px;
    cursor: pointer;
    color: white;
    background-color: #1e90ff;
    transform: translateX(2px);
  }
  `
}
