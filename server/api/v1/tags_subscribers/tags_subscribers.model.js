let mongoose = require('mongoose')
let Schema = mongoose.Schema

const tagSchema = new Schema({
  tagId: {type: Schema.ObjectId, ref: 'tags'},
  subscriberId: {type: Schema.ObjectId, ref: 'subscribers'},
  companyId: {type: Schema.ObjectId, ref: 'companyprofile'},
  dateCreated: {type: Date, default: Date.now}
})

module.exports = mongoose.model('tags_subscribers', tagSchema)
