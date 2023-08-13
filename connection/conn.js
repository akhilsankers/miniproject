const express = require("express");
const app=express()
const mongoose = require("mongoose");
mongoose.connect('mongodb://127.0.0.1:27017/Craft_hive',{
    useNewUrlParser:true,
    useUnifiedTopology:true,
},).then(()=>console.log('connected sucessfully'))
.catch((err) => {console.error(err);})