exports.getQueryData = (type, purpose, match, skip, sort, limit) => {
  if (type === 'count') {
    return {
      purpose,
      match,
      group: { _id: null, count: { $sum: 1 } }
    }
  } else {
    return {
      purpose,
      match,
      skip,
      sort,
      limit
    }
  }
}

exports.getUpdateData = (purpose, match, updated, upsert, multi, neww) => {
  return {
    purpose,
    match,
    updated,
    upsert: upsert || false,
    multi: multi || false,
    new: neww || false
  }
}
