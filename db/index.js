const mongoose = require("mongoose")

const dbConnection = ()=>{
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL,{
    // useNewUrlParser:true,
    // useUnifiedTopology: true,
  //  userCreateIndex: true,
}).then(console.log("Connected to Database")).catch((err)=> console.warn(err))
}

module.exports = {dbConnection}