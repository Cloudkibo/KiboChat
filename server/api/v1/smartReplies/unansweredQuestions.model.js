let mongoose = require('mongoose')
let Schema = mongoose.Schema

const unansweredQuestionsSchema = new Schema({
  botId: {type: Schema.ObjectId, ref: 'bots'},
  intentId: String, // This will represent each unique intent
  Question: String,
  Confidence: Number,
  datetime: {type: Date, default: Date.now}
})

module.exports = mongoose.model('unansweredQuestions', unansweredQuestionsSchema)
