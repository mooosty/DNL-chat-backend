const mongoose  = require("mongoose")

const userSchema = new mongoose.Schema({
    userid:{
        type: String,
        required: true,
        unique: true,
    },
    hash:{
        type: String,
        
    },
    status:{
        type: Boolean,
        
    }
},
{timestamps:true}
)

const Hash = mongoose.model("hash", userSchema);

module.exports = Hash

