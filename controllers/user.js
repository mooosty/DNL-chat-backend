const generateToken = require("../db/token")
const { sendNewMail } = require("../email")
const Hash = require("../models/hash")
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

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const findUser = await User.findOne({ email: email })
        if (!findUser) return res.status(404).send({ status: false, message: "Incorrect email or password." })
        const validate = await matchPassword(findUser.password, password)
        if (!validate) return res.status(400).send({ status: false, message: "Incorrect email or password." })
        return res.status(201).send({ status: true, data: findUser, token: generateToken(findUser._id) })
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


//GET HASH 
const getHash =async(req,res)=>{
    try {
        const hash = Hash.findOne({userid:req.body.userid})
        return res.send(hash)
    } catch (error) {
        return res.send(error)
        
    }
}

//SEND RECOVER PASSWORD
const sendRecoveryLink = async (req, res) => {
    try {
        const users = await User.findOne({ email: req.body.email })
        !users && res.status(400).json({ status: false, message: "No such user exists" })
        const hashkey = await Hash.findOne({ userid: users._id })
        if (!hashkey) {
            const newHash = new Hash({ userid: users._id, hash: "", status: false })
            const user = await newHash.save()
        }
        sendNewMail(users.email, users._id).then(e => {
            if (e == 0) {
                res.status(400).json({ status: false, message: "Email could not sent." })
            }
            else {
                res.status(201).json({ status: true, message: "Activation link sent successfully." })
            }
        })
        }
    catch (err) {
        res.status(500).json(err)

    }
}

//ACTIVATE PASSWORD PASSWORD
const activateRecoveryLink= async (req, res) => {
    const user = await Hash.findOne({ userid: req.body.userid })
    if (!user) return res.status(404).json({ status: false, message: "No record found" })
    else if (user.hash !== req.body.hash) return  res.status(401).json({ status: false, message: "Unauthorized Access." })
    else if (user.hash === "") return res.status(410).json({ status: false, message: "Link Expired." })
    else {
        try {
            await Hash.findOneAndUpdate(
                { userid: req.body.userid },
                {
                    $set: {
                        status: true
                    },
                },
                { new: true }
            );
           return res.status(200).json({ status: true, message: "Available to reset password." })


        }
        catch (err) {
            console.log(err)
           return res.status(400).json({ status: true, message: err })
            }
    }
}


//RESET PASSWORDS
const resetPassword= async (req, res) => {

    const user = await Hash.findOne({ userid: req.body._id })
    if (!user) return res.status(404).json({ status: false, message: "No record found" })
    else if (user.status == false) return  res.status(401).json({ status: false, message: "Can not reset password for this user. Please activate reset URL first." })
    else if(!req.body.password || req.body.password.length<7) return res.status(401).json({ status: false, message: "Password is required and must be 8 digits or more." })
    else {
        try {
            const salt = await bcrypt.genSalt(10)
            const hashpassword = await bcrypt.hash(req.body.password, salt)
            console.log(hashpassword)
            await User.findByIdAndUpdate(
                req.body._id,
                {
                    $set: {
                        password: hashpassword
                    },
                },
                { new: true }
            );
            try {
                const salt = await bcrypt.genSalt(10)
                const hashpassword = await bcrypt.hash(req.body.password, salt)
                console.log(hashpassword)
                await Hash.findOneAndUpdate(
                    { userid: req.body._id },
                    {
                        $set: {
                            hash: "",
                            status: false
                        },
                    },
                    { new: true }
                );
                res.status(200).json({ status: true, message: "Reset done. You can login back now." })
            }
            catch (err) {
                console.log(err)
                res.status(400).json({ status: true, message: err })

                return err

            }

        }
        catch (err) {
            console.log(err)
            res.status(400).json({ status: true, message: err })

            return err

        }

    }
}

async function generateHashedPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}
async function matchPassword(password, passwordToCompare) {
    return await bcrypt.compare(passwordToCompare, password)
}
module.exports = { createUser, getUsers, loginUser, sendRecoveryLink,activateRecoveryLink,resetPassword,getHash }
