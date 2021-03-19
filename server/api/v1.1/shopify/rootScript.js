exports.renderJS = (mainScriptUrl, companyId, shopifyIntegration) => {
  return `
  window.__kibocompany__ = "${companyId}";
  window.__kiboshopifyId__ = "${shopifyIntegration}";
  (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.async = true; js.defer = true;
      js.src = "${mainScriptUrl}";
      fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'kibo-shopify'));
  `
}
