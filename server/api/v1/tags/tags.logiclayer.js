exports.removeDuplicates = (tags) => {
  let dataToSend = [tags[0]]
  let tagArray = [tags[0].tag]
  for (let i = 1; i < tags.length; i++) {
    if (!tagArray.includes(tags[i].tag)) {
      dataToSend.push(tags[i])
      tagArray.push(tags[i].tag)
    }
  }
  return dataToSend
}
