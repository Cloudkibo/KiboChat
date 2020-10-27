exports.createAddOnsPayload = (data) => {
  const payload = {
    feature: data.feature,
    description: data.description,
    price: `${data.price}`,
    currency: data.currency,
    permissions: data.permissions,
    others: data.others
  }
  return payload
}
