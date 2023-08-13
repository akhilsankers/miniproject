const mongoose = require('mongoose');
const order = new mongoose.Schema({
  productName: String,
  productId:String,
  userId:String,
  username:String,
  prize: Number,
  address: String,
  pincode:String,
  status:String,
  data: Buffer,
  contentType: String,
  quantity: Number
});
  const Order = mongoose.model('Order', order);
  module.exports = Order;