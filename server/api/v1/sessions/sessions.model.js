'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let FacebookSessionSchema = new Schema({
  subscriber_id: {type: Schema.ObjectId, ref: 'subscribers'},
  page_id: {type: Schema.ObjectId, ref: 'pages'},
  company_id: String,
  status: {type: String, default: 'new'},
  is_assigned: {type: Boolean, default: false},
  assigned_to: Schema.Types.Mixed,
  request_time: {type: Date, default: Date.now},
  last_activity_time: {type: Date, default: Date.now},
  agent_activity_time: Date
})

module.exports = mongoose.model('sessions', FacebookSessionSchema)
