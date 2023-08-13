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
  
  const Cart = mongoose.model('Cart', Cartproduct);
  module.exports = Cart;