const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  name: String,
  prize: Number,
  description: String,
  creater:String,
  createrid:String,
  category :String,
  data: Buffer,
  contentType: String
});

const PreImage = mongoose.model('PreImage', imageSchema);

module.exports = PreImage;

