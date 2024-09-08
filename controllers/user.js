const generateToken = require("../db/token")
const User = require("../models/user")
const bcrypt = require("bcryptjs")

const createUser = async (req, res) => {
    try {
        let { password } = req.body
        const findUser = await User.findOne({ email: req.body.email })
        if (findUser) return res.status(400).send({ status: false, error: "User with this email already exists. Try a different one." })
        const hashedPassword = await generateHashedPassword(password);
        const user = new User({ ...req.body, password: hashedPassword });
        await user.save()
        res.status(200).send({ status: true, data: user, message: "user created successfully." })
    } catch (error) {
        res.status(500).send({ status: false, error: error, message: "Internal server error." })
        console.error("Error creating user:", error); // Log the error for debugging
    }
}
     
const loginUser = async (req,res)=>{
    try {
        const {email,password} = req.body
        const findUser = await User.findOne({email:email})
        if(!findUser) return res.status(404).send({status:false,message:"Incorrect email or password."})
        const validate = await matchPassword(findUser.password,password)
        if(!validate) return res.status(400).send({status:false,message:"Incorrect email or password."})
        return res.status(201).send({status:true,data:findUser,token:generateToken(findUser._id)})
        } catch (error) {
            res.status(500).send({ status: false, error: error, message: "Internal server error." })
            console.error("Error creating user:", error); // Log the error for debugging
       
    }
}

const getUsers = async (req, res) => {
    try {
        const users = await User.find()
        res.status(201).send({ status: true, data: users })
    } catch (error) {
        res.status(500).send({ status: false, error: error, message: "Internal server error." })
        console.error("Error creating user:", error); // Log the error for debugging

    }
}



async function generateHashedPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}
async function matchPassword(password,passwordToCompare){
    return await bcrypt.compare(passwordToCompare,password)
}
module.exports = { createUser, getUsers,loginUser }
