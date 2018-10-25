let mongoose = require('mongoose')
let Schema = mongoose.Schema

const botSchema = new Schema({
  pageId: {type: String}, // TODO ENUMS
  userId: {type: Schema.ObjectId},
  companyId: {type: Schema.ObjectId},
  botName: String,
  witAppId: String,
  witToken: String,
  witAppName: String,
  isActive: String,
  payload: [
    {
      questions: [String],
      answer: String,
      intent_name: String
    }],
  hitCount: Number,
  missCount: Number,
  datetime: {type: Date, default: Date.now},
  blockedSubscribers: [String]
})

module.exports = mongoose.model('bots', botSchema)
