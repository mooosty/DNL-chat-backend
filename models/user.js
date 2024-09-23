const mongoose = require("mongoose")


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true
    },                             
    password:{
        type:String,
        required:true
    },                               
    profilePhoto:{
        type:String,
        required:true
    },                 
    unreadCount: { type: Number, default: 0 }, // Field to track unread messages
                                             
},                 
{
    timeStamps:true
})

const User = mongoose.model("User", userSchema);

module.exports = User;
