exports.renderHtml = (storeName, order, storeType, companyId, contactId, orderPayload) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>KiboPush Order Confirmation Page</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
</head>
<body>

<div class="container-fluid">
  <div class="row content">

    <div class="col-sm-9">
      <h4><small>Cash on Delivery Order Confirmation</small></h4>
      <hr>
      <h2>Your order on ${storeName}</h2>
      <p>This is to confirm your order number ${order} as the order is cash on delivery. You can confirm the order now or cancel it if you made it accidentally.</p>
      <br>
      <ol id="items">
      </ol>
      <br><br>

      <div id="btns">
        <button id="confirm" type="button" class="btn btn-primary">Confirm</button>
        <button id="cancel" type="button" class="btn btn-danger">Cancel</button>
        <br><br>
      </div>

      <div id="alertBox" class="container"></div>
      
    </div>
  </div>
</div>

<script>
    document.getElementById("confirm").onclick = confirmBtn;
    document.getElementById("cancel").onclick = cancelBtn;
    let orderPayload = JSON.parse('${JSON.stringify(orderPayload)}')
    function confirmBtn(elm) {
      $.post("/api/supernumber/addConfirmTag",
      {
        storeType: "${storeType}",
        order: "${order}",
        contactId: "${contactId}",
        companyId: "${companyId}",
        storeName: "${storeName}"
      })
      .done((data) => {
        $("#alertBox").html(\`
          <div class='alert alert-success alert-dismissible'>
          <a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>
          Order is confirmed successfully.
          </div>
        \`)
        $("#btns").hide()
      })
      .fail((xhr, status, error) => {
        $("#alertBox").html(\`
          <div class='alert alert-danger alert-dismissible'>
          <a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>
          Some error occurred. Please contact the store owner.
          </div>
        \`)
        $("#btns").hide()
      })
    }
    
    function cancelBtn(elm) {
      $.post("/api/supernumber/addCancelledTag",
      {
        storeType: "${storeType}",
        order: "${order}",
        contactId: "${contactId}",
        companyId: "${companyId}",
        storeName: "${storeName}"
      })
      .done((data) => {
        $("#alertBox").html(\`
          <div class='alert alert-success alert-dismissible'>
          <a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>
          Order is cancelled successfully.
          </div>
        \`)
        $("#btns").hide()
      })
      .fail((xhr, status, error) => {
        $("#alertBox").html(\`
          <div class='alert alert-danger alert-dismissible'>
          <a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>
          Some error occurred. Please contact the store owner.
          </div>
        \`)
        $("#btns").hide()
      })
    }

    let sum = 0
    let currencyName = ''
    for(let i=0; i<orderPayload.lineItems.length; i++) {
      const { name, quantity, price, currency} = orderPayload.lineItems[i]

      $('#items').append('<li><b>Item: </b>'+ name +' <b>Quantity: </b>'+ quantity +' <b>Price: </b>'+ currency +' '+ price +'</li>')

      sum += price
      currencyName = currency
    }
    $('#items').after('<br>', '<p><b>Total Price: </b>'+ currencyName +' '+ sum +'</p>')
  </script>

</body>
</html>
`
}
