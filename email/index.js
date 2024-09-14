
const nodemailer = require("nodemailer")
const Hash = require("../models/hash")
const bcrypt = require("bcrypt")
const sendNewMail = async (email, id) => {
    const hash = makeid(100) + `&&ID=${id}`
    console.log(`http://localhost:3000/reset-password/${hash}`)
    let transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 465,
        secure: true,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions = {
        from: 'no-reply@devstax.org',
        to: email,
        subject: 'Password-Reset',
        html: `<div>
           <h1>Here is the Link to Update your password.</h1>
           <p>This is your one time activation link. It will be expired in a while</p>
           <a href=${`http://localhost:3000/reset-password/${hash}`} target="_blank" >Reset Password</a>
           
        </div>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error.message)
            return 0;
        }
        else {
            console.log("success")

            return 1
        }
    });
    try {
        await Hash.findOneAndUpdate(
            { userid: id },
            {
                $set: {
                    hash: hash
                },
            },
            { new: true }
        );

        return 1
    }
    catch (err) {
        console.log(err)
        return err

    }



}

const sendNotificationEmail = async(email,invitee,group)=>{
    let transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 465,
        secure: true,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions = {
        from: 'no-reply@devstax.org',
        to: email,
        subject: 'New Invite to Join',
        html: `<div>
           <p>${invitee} has requested to join your channnel. To accept or reject the invite you need to login to your account</p>
           <a href=${`${process.env.FRONTEND_URL}/${group}`} target="_blank" >Check Invites</a>
           
        </div>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error.message)
            return 0;
        }
        else {
            console.log("success")

            return 1
        }
    });
}
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

module.exports = {sendNewMail,sendNotificationEmail}