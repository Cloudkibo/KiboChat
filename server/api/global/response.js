exports.sendErrorResponse = (res, statusCode, payload, description) => {
  return res.status(statusCode).json({status: 'failed', payload, description})
}

exports.sendSuccessResponse = (res, statusCode, payload, description) => {
  return res.status(statusCode).json({status: 'success', payload, description})
}
