'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let NotificationsSchema = new Schema({
  message: String,
  category: Schema.Types.Mixed, // livechat or other
  seen: {type: Boolean, default: false},
  agentId: {type: Schema.ObjectId, ref: 'users'},
  companyId: {type: Schema.ObjectId, ref: 'companyprofile'},
  datetime: { type: Date, default: Date.now }
})

module.exports = mongoose.model('notifications', NotificationsSchema)
