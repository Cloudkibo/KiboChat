let mongoose = require('mongoose')
let Schema = mongoose.Schema

const waitingSubscribers = new Schema({
  botId: {type: Schema.ObjectId, ref: 'bots'},
  subscriberId: {type: Schema.ObjectId, ref: 'subscribers'},
  pageId: {type: Schema.ObjectId, ref: 'pages'},
  intentId: String, // This will represent each unique intent
  Question: String,
  datetime: {type: Date, default: Date.now}
})

module.exports = mongoose.model('waitingSubscribers', waitingSubscribers)
