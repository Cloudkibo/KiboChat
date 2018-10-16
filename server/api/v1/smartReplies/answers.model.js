
let mongoose = require('mongoose')
let Schema = mongoose.Schema

const answerSchema = new Schema({
  botId: {type: Schema.ObjectId, ref: 'bots'},
  intentId: String, // This will represent each unique intent
  questions: [String],
  answer: String,
  datetime: {type: Date, default: Date.now}
})

module.exports = mongoose.model('answers', answerSchema)
