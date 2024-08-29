const { default: mongoose } = require("mongoose");
const Chat = require("../models/chat");
const User = require("../models/user");


const createAGroup = async (req, res) => {
    let { name, users } = req.body;

    if (!name) return res.status(400).send({ status: false, message: "Group should have a name." });

    let userArray = users
    if (!Array.isArray(users)) return res.status(400).send({ status: false, message: "Invalid User data format." })
    if (userArray.length < 2) return res.status(400).send({ status: false, message: "Minimum 2 members are required." });
    console.log(userArray, req.user._id.toString())
    if (userArray.includes(req.user._id.toString())) return res.status(400).send({ status: false, message: "Cannot create a group with yourself." });
    const checkValid = checkValidFormat(userArray)
    if (checkValid) return res.status(400).send({ status: false, message: checkValid })
    // Check if all users exist
    const existingUsers = await User.find({ _id: { $in: userArray } });
    if (existingUsers.length !== userArray.length) {
        return res.status(400).send({ status: false, message: "One or more users do not exist." });
    }

    userArray.push(req.user._id);  // Add the current user to the group

    try {
        const createGroup = await Chat.create({
            chatName: name,
            users: userArray,
            groupAdmin: req.user._id,
            isGroupChat: true
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
        if (!chatId) return res.status(400).send({ status: false, error: "chat ID is required." })
        if (!userId) return res.status(400).send({ status: false, error: "user ID is required." })
        const findGroup = await Chat.findById(chatId)
        const findUser = await User.findById(userId)
        if (!findGroup) return res.status(404).send({ status: false, error: "No group exists." })
        if (!findUser) return res.status(404).send({ status: false, error: "No user exists." })
        if (findGroup.groupAdmin._id.toString() != req.user._id.toString()) return res.status(400).send({ status: false, error: "Only Channel Admin can remove the user from group." })
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
const fetchChats = async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "name pic email",
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};


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

module.exports = { createAGroup, deleteGroup, getAllGroups, addToGroup, fetchChats, removeUserFromGroup }
