const mongoose = require('mongoose');

const fedSchema = new mongoose.Schema({
  name: String,
  prize: Number,
  description: String,
  creater:String,
  createrid:String,
  category :String,
  data: Buffer,
  contentType: String
});

const Feed = mongoose.model('Feed', fedSchema);

module.exports = Feed;

