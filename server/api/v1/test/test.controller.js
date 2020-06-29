// Web layer of this API node

exports.index = function (req, res) {
  res.status(200).json({status: 'success', payload: 'Hello World'})
}
