
'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let menuSchema = new Schema({
  pageId: {type: String, ref: 'pages'},
  userId: {type: Schema.ObjectId, ref: 'users'},
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  jsonStructure: Schema.Types.Mixed
})

module.exports = mongoose.model('menu', menuSchema)
