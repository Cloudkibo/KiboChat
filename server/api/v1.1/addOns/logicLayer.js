exports.createAddOnsPayload = (data, platform) => {
  const payload = {
    feature: data.feature,
    description: data.description,
    price: `${data.price}`,
    currency: data.currency,
    permissions: data.permissions,
    others: data.others,
    platform: platform
  }
  return payload
}
