let  = require('')
let Schema = .Schema

const listSchema = new Schema({
  listName: {
    type: String
  },
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  datetime: { type: Date, default: Date.now },
  content: {type: Schema.Types.Mixed},
  conditions: {type: Schema.Types.Mixed},
  initialList: Boolean,
  parentList: { type: Schema.ObjectId },
  parentListName: { type: String }
})

module.exports = .model('lists', listSchema)
