const mongoose = require("mongoose");    
const preemployeeSchema = new mongoose.Schema ({
    name: {
        type:String,
        required: true
        }, 
        email:{
            type: String, 
            required:true, 
            unique: true
        }
        , 
        password:{
            type: String, 
            required:true, 
        }     ,
         aadhar:{
            type: Number, 
            required:true, 
        }
        ,
        contactnumber:{
            type: Number, 
            required:true, 
        }
        ,
        token: {
            type: String,
            default: ''
          },
})
const PreSeller = new mongoose.model("PreSeller", preemployeeSchema);
module.exports = PreSeller;

