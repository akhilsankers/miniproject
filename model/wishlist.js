const mongoose = require('mongoose');
const Cartproduct = new mongoose.Schema({
    productName: String,
    productId:String,
    userId:String,
    prize: Number,
    description: String,
    data: Buffer,
    contentType: String,
    quantity: Number
  });
  
  const Wishlist = mongoose.model('Wishlist', Cartproduct);
  module.exports = Wishlist;