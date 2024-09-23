const { default: mongoose } = require("mongoose");
const Chat = require("../models/chat");
const User = require("../models/user");
const { sendNotificationEmail } = require("../email");


const createAGroup = async (req, res) => {
    let { name, users } = req.body;

    if (!name) return res.status(400).send({ status: false, error: "Group should have a name." });

    let userArray = users
    if (!Array.isArray(users)) return res.status(400).send({ status: false, error: "Invalid User data format." })
    if (userArray.length < 2) return res.status(400).send({ status: false, error: "Minimum 2 members are required." });
    console.log(userArray, req.user._id.toString())
    if (userArray.includes(req.user._id.toString())) return res.status(400).send({ status: false, message: "Cannot create a group with yourself." });
    const checkValid = checkValidFormat(userArray)
    if (checkValid) return res.status(400).send({ status: false, message: checkValid })
    // Check if all users exist
    const existingUsers = await User.find({ _id: { $in: userArray } });
    if (existingUsers.length !== userArray.length) {
        return res.status(400).send({ status: false, error: "One or more users do not exist." });
    }

    userArray.push(req.user._id);  // Add the current user to the group

    try {
        const createGroup = await Chat.create({
            chatName: name,
            users: userArray,
            groupAdmin: req.user._id,
            isGroupChat: true,
            unreadCounts: new Map(userArray.map(userId => [userId.toString(), 0])), // Initialize unreadCounts

        });

        const fullGroupChat = await Chat.findOne({ _id: createGroup._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: false, error: "Internal Server Error" });
    }
};


//Join Group

//Add/Join User to a group
const addToGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    if (!chatId) return res.status(400).send({ status: false, error: "chat ID is required." })
    if (!userId) return res.status(400).send({ status: false, error: "user ID is required." })
    const findGroup = await Chat.findById(chatId)
    const findUser = await User.findById(userId)
    if (!findGroup) return res.status(404).send({ status: false, error: "No group exists." })
    if (!findUser) return res.status(404).send({ status: false, error: "No user exists." })
    // if (findGroup.groupAdmin._id.toString() != req.user._id.toString()) return res.status(400).send({ status: false, error: "Only Channel Admin can add the user to group." })
    const isUserAlreadyMember = findGroup.users.some(
        (user) => user.toString() === userId
    );

    if (isUserAlreadyMember) {
        return res.status(400).send({ status: false, error: "User is already a member of the group." });
    }
    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
};


//Remove User from Group   
const removeUserFromGroup = async (req, res) => {
    try {
        const { chatId, userId } = req.body
        let verifyAuth =false
    
        console.log(userId,req.user._id.toString())
        if (!chatId) return res.status(400).send({ status: false, error: "chat ID is required." })
        if (!userId) return res.status(400).send({ status: false, error: "user ID is required." })
        const findGroup = await Chat.findById(chatId)
        const findUser = await User.findById(userId)
        if (!findGroup) return res.status(404).send({ status: false, error: "No group exists." })
        if (!findUser) return res.status(404).send({ status: false, error: "No user exists." })
        if(findGroup.groupAdmin._id.toString() == req.user._id.toString() || req.user._id.toString() == userId){ verifyAuth =true}
        if(!verifyAuth)  return res.status(400).send({ status: false, error: "Only Channel Admin can remove the user from group." })
        const userIndex = findGroup.users.findIndex((user) => user.toString() === userId);

        if (userIndex === -1) {
            return res.status(400).send({ status: false, error: "User is not a member of the group." });
        }

        findGroup.users.splice(userIndex, 1);
        await findGroup.save();

        res.status(200).send({
            status: true,
            message: `User has been removed from the group.`,
            group: findGroup,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: false, error: "Internal Server Error" });

    }
}


//Get Group Chats 
// const fetchChats = async (req, res) => {
//     try {
//         Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
//             .populate("users", "-password")
//             .populate("groupAdmin", "-password")
//             .populate("latestMessage")
//             .sort({ updatedAt: -1 })
//             .then(async (results) => {
//                 results = await User.populate(results, {
//                     path: "latestMessage.sender",
//                     select: "name pic email",
//                 });
//                 res.status(200).send(results);
//             });
//     } catch (error) {
//         res.status(400);
//         throw new Error(error.message);
//     }
// };

const fetchChats = async (req, res) => {
    try {
        const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        const results = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name pic email",   
        });     
          
        const chatsWithUnreadCounts = results.map(chat => ({
            ...chat.toObject(),
            unreadCount: chat.unreadCounts.get(req.user._id.toString()) || 0 // Include unread count
        }));      
                
        res.status(200).send(chatsWithUnreadCounts);
    } catch (error) {
        res.status(400).send({ status: false, error: error.message });
    }
};


//Request Invite
const requestInvite = async (req, res) => {
    try {
        const { chatId } = req.body
        if (!chatId) return res.status(400).send({ status: false, error: "chat ID is required." })
        const findGroup = await Chat.findById(chatId)
        const findUser = await User.findById(req.user._id.toString())
        if (!findGroup) return res.status(404).send({ status: false, error: "No group exists." })
        if (!findUser) return res.status(404).send({ status: false, error: "No user exists." })
        const isUserAlreadyMember = findGroup.users.some(
            (user) => user.toString() === req.user._id.toString()
        );
        const isUserAlreadyInvited = findGroup.requestedInvites.some(
            (user) => user.toString() === req.user._id.toString()
        );
         const isUserAlreadyRejected = findGroup.invitesRejected.filter(
            (user) => user.user.toString() === req.user._id.toString()
        );
        const now = Date.now();
        const isLessThan24Hours = now - (24 * 60 * 60 * 1000); // Timestamp for 24 hours ago
        
        // Check if the user has any rejections
        if (isUserAlreadyRejected.length > 0) {
            const mostRecentRejectionDate = new Date(isUserAlreadyRejected[0].createdAt).getTime(); 
        
            // Check if the most recent rejection is less than 24 hours old
            console.log(mostRecentRejectionDate,isLessThan24Hours)
            if (mostRecentRejectionDate > isLessThan24Hours) {
                return res.status(400).json({ status: false, error: "Invitation cannot be sent. Try again in 24 hours." });
            }
        }
        if (isUserAlreadyInvited) {
            return res.status(400).send({ status: false, error: "Invitation is already sent to the group admin." });
        }
        if (isUserAlreadyMember) {
            return res.status(400).send({ status: false, error: "User is already a member of the group." });
        }
        //Check if user is blocked or restricted from joining the group. (Needs to be done later)
        else {
            //Now request the invite as the user as user does not exist.
            const updateInvitee = await Chat.findByIdAndUpdate(chatId,
                {
                    $push: { requestedInvites: req.user._id },
                },
                {
                    new: true,
                }
            )

            //Send notification email to group admin on any invite comes to join what user requested.
            await sendNotificationEmail(findGroup.groupAdmin.email, findUser.username, findGroup.chatName)
            res.status(200).send({ status: true, message: "Invitation sent to the group admin." })


        }
    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: false, error: "Interal Server Error" })
    }
}

//Accept received invitation (group admin)
const respondToInvite = async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        const { response } = req.query
        let responseQuery = false
        if (!response) return res.status(400).send({ status: false, error: "Query response is missing." })
        if (response.toLowerCase() == "accept") responseQuery = true
        if (response.toLowerCase() == "reject") responseQuery = true
        if (!responseQuery) return res.status(400).send({ status: false, error: "Invalid response passed in query." })
        if (!chatId) return res.status(400).send({ status: false, error: "chat ID is required." })
        if (!userId) return res.status(400).send({ status: false, error: "user ID is required." })
        const findGroup = await Chat.findById(chatId).populate("users")
        const findUser = await User.findById(userId)
        if (!findGroup) return res.status(404).send({ status: false, error: "No group exists." })
        if (!findUser) return res.status(404).send({ status: false, error: "No user exists." })
            console.log(findGroup)
        if (findGroup.groupAdmin._id.toString() != req.user._id.toString()) return res.status(400).send({ status: false, error: "Admin Access Required" })
        const isUserAlreadyMember = findGroup.users.some(
            (user) => user.toString() === userId
        );  
        const isUserAlreadyInvited = findGroup.requestedInvites.some(
            (user) => user.toString() === userId
        );
       
        if (!isUserAlreadyInvited) {
            return res.status(400).send({ status: false, error: "No such active invite." })
        }  
        if (isUserAlreadyMember) {
            return res.status(400).send({ status: false, error: "User is already a member of the group." });
        }
        const filterInvite = findGroup.requestedInvites.filter(f => f._id.toString() != userId)
        let updateFields = {};
        if (response.toLowerCase() === "accept") {
            updateFields = {
                    $push: { users: userId },
                    $set: { requestedInvites: filterInvite }
            }
        } else {
            updateFields = {  
                $push: { invitesRejected: { user: userId } },
                $set: { requestedInvites: filterInvite }
            }
        }
        const data =await Chat.findByIdAndUpdate(chatId, updateFields,{new:true})
        res.status(200).send({status:true,message:`${response} reqest for ${findUser.username} was successful.`, data:data})

    //Add user to the group now as all required checks are passed as above

} catch (error) {  
    console.log(error.message)
    return res.status(500).send({ status: false, error: "Internal Server Error.", message: error.message })
}
}

//Accept received invitation (user => invite sent by admin/owner of the group)

//Discard received invitation (group admin)

//Discard received invitation (user => invite sent by admin/owner of the group)


//Get All Groups
const getAllGroups = async (req, res) => {
    try {
        const getChat = await Chat.find().populate("users", "-password")
            .populate("groupAdmin", "-password")
        res.status(201).send({ status: true, data: getChat })

    } catch (error) {
        console.error(error);   
        res.status(500).send({ status: false, error: "Internal Server Error" });

    }
}

//Delete Group
const deleteGroup = async (req, res) => {
    try {
        const findGroup = await Chat.findById(req.body._id)
        if (!findGroup) return res.status(404).send({ status: false, message: "No such group exists." })
        if (findGroup.groupAdmin._id.toString() != req.user._id.toString()) return res.status(400).send({ status: false, message: "Only Channel Admin can delete the group." })
        await Chat.findByIdAndDelete(findGroup._id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: false, error: "Internal Server Error" });
    }
}


function checkValidFormat(userArray) {
    for (let i = 0; i < userArray.length; i++) {
        if (!mongoose.Types.ObjectId.isValid(userArray[i])) {
            return `Inval9id ID format: ${userArray[i]}`;
        }
    }
}

module.exports = { createAGroup, deleteGroup, getAllGroups, addToGroup, fetchChats, removeUserFromGroup, requestInvite, respondToInvite }
