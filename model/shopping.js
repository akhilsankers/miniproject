const mongoose = require('mongoose');
const Ship = new mongoose.Schema({
    productName: String,
    productId:String,
    userId:String,
    username:String,
    prize: Number,
    address: String,
    pincode:String,
    data: Buffer,
    contentType: String,
    quantity: Number
  });
  
  const Shippi = mongoose.model('Shippi', Ship);
  module.exports = Shippi;