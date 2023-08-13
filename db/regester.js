const mongoose = require("mongoose");    
const employeeSchema = new mongoose.Schema ({
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
        }
        ,
        token: {
            type: String,
            default: ''
          }
        ,
        address:{
            type: String, 
            required:true, 
        }
        ,
        pincode:{
            type: String, 
            required:true, 
        }

})
const Register = new mongoose.model("Register", employeeSchema);
module.exports = Register;

