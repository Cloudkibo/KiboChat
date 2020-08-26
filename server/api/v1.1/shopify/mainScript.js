exports.renderJS = (pageId, appId, shopUrl) => {
  return `
		window.fbAsyncInit = function() {
	    FB.init({
	      appId            : '${appId}',
	      autoLogAppEvents : true,
	      xfbml            : true,
	      version          : 'v3.3'
	    });
		

	    FB.Event.subscribe('messenger_checkbox', function(e) {
	      console.log("messenger_checkbox event");
	      console.log(e);
	      
	      if (e.event == 'rendered') {
	        console.log("Plugin was rendered");
	      } else if (e.event == 'checkbox') {
	    	  var checkboxState = e.state;
	    	  let subscribeButton = document.getElementById("kiboSubscribeButton")
	    	  subscribeButton.dataset.checkState = e.state
	        console.log("Checkbox state: " + checkboxState);
	      } else if (e.event == 'not_you') {
	        console.log("User clicked 'not you'");
	      } else if (e.event == 'hidden') {
	        console.log("Plugin was hidden");
	      }
	      
	    });
	  };
	  
	  function setCookie(cname, cvalue, exdays) {
	      var d = new Date();
	      d.setTime(d.getTime() + (exdays*24*60*60*1000));
	      var expires = "expires="+ d.toUTCString();
	      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
	  }

	  function getCookie(cname) {
	      var name = cname + "=";
	      var decodedCookie = decodeURIComponent(document.cookie);
	      var ca = decodedCookie.split(';');
	      for(var i = 0; i < ca.length; i++) {
	          var c = ca[i];
	          while (c.charAt(0) == ' ') {
	              c = c.substring(1);
	          }
	          if (c.indexOf(name) == 0) {
	              return c.substring(name.length, c.length);
	          }
	      }
	      return "";
	  }

	  function confirmOptIn(userRef) {
	  	let subscribeButton = document.getElementById("kiboSubscribeButton")
	  	console.log("Confirm Opt In clicked and checked state", userRef.value, subscribeButton.dataset.checkState, getCookie('kibopushCartValue'))
	  	if(subscribeButton.dataset.checkState === 'unchecked'){
	  		return
	  	}
	    FB.AppEvents.logEvent('MessengerCheckboxUserConfirmation', null, {
	      'app_id': '${appId}',
	      'page_id':  '${pageId}',
	      'ref': 'SHOPIFY',
	      'user_ref': userRef.value
	    });
		  let kiboBox = document.getElementById("kiboBox")
		  kiboBox.innerHTML = '<p style="padding: 10px; margin: 10px;"> Thank you for subscribing! </p>'
		  setCookie('kibopushCartValue', userRef.value.split('-')[0])
	  }

	  const uniqueString = Math.floor(new Date().valueOf() * Math.random())

	  function renderElement(userRef, d, s, id) {
		(function(d, s, id){
		   var js, fjs = d.getElementsByTagName(s)[0];
		   if (d.getElementById(id)) {return;}
			 js = d.createElement(s); js.id = id;
			 js.async = true; js.defer = true;
		   js.src = "https://connect.facebook.net/en_US/sdk.js";
		   fjs.parentNode.insertBefore(js, fjs);
		 }(d, s, id));		

	  	let element = document.createElement('div')
	  	element.id = 'kiboBox'
	  	const pageId = '${pageId}'
	  	let text = document.createTextNode('Hello From KiboPush: ' + pageId)
	  	let messengerComponent = document.createElement('div')
	  	messengerComponent.classList.add("fb-messenger-checkbox");
	  	messengerComponent.setAttribute('origin', 'https://${shopUrl}/');
	  	messengerComponent.setAttribute('page_id',  pageId);
	  	messengerComponent.setAttribute('messenger_app_id',  '${appId}');
	  	console.log("User Ref before rendering", userRef)
	  	messengerComponent.setAttribute('user_ref', userRef);
	  	messengerComponent.setAttribute('ref', 'SHOPIFY');
	  	messengerComponent.setAttribute('center_align', 'true');
			messengerComponent.setAttribute('allow_login', 'true');
			messengerComponent.setAttribute("size", "large")
			messengerComponent.setAttribute("skin", "light")
	  	element.innerHTML = '<button onclick="confirmOptIn(this)" value=' + userRef + ' id="kiboSubscribeButton"  style="display:block; margin-left: 30px; margin-bottom:15px; color: white; background: skyblue; border: 0; padding: 5px;">Subscribe to get discount offers</button>'
	  	element.prepend(messengerComponent)
	  	element.style['background'] = '#EEEEEE'
	  	element.style['text-align'] = 'center'
	  	element.style['z-index'] = '100'
	  	element.style['position'] = 'fixed'
	  	element.style['vertical-align'] = 'middle'
	  	element.style['color'] = 'grey'
	  	element.style['padding-top'] = '10px'
	  	element.style['bottom'] = '15px'
	  	element.style['right'] = '15px'
	  	element.style['border-top-style'] = 'solid'
	  	element.style['border-top-color'] = 'red'
	  	document.body.prepend(element)


	  }



	
       
  		(function (d, s, id) {
		  console.log('Executing KiboPush Script')
		  if (window.location.pathname.split('/').length == 2 && window.location.pathname.split('/')[1] == 'cart') {
		    console.log('Component Will Render')
		    $.ajax({
		      type: 'GET',
		      url: '/cart.js',
		      cache: false,
		      dataType: 'json',
		      success: function (cart) {
					  console.log('Hurray I got the cart object', cart)
					  if(getCookie('kibopushCartValue') == cart.token){
					  	console.log("Customer has already subscribed")
					  	return 
					  }
					  renderElement(cart.token + '-' + uniqueString, d, s, id)
		      }
			})
		    
		  }
			
		  
		  console.log('Successfully executed KiboPush Script')
		}(document, 'script', 'facebook-jssdk'))`
}
