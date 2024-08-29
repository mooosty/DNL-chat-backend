const Chat = require( "../models/chat");
const Message =require( "../models/message");
const User= require("../models/user");



const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;
  
    if (!content || !chatId) {
      console.log("Invalid data passed into request");
      return res.status(400).send({status:false, error:"Invalid data passed into request"});
    }
  
    var newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
    };
    const findChat = await Chat.findById(chatId)
    if (!findChat) return res.status(404).send({status:false, message:"No such chat exists."})
  
    try {
      var message = await Message.create(newMessage);
  
      message = await message.populate("sender");
      message = await message.populate("chat");
      message = await User.populate(message, {
        path: "chat.users",
        select: "name  email",
      });

  
      await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });
  
      res.json(message);
    } catch (error) {
      res.status(400).send({status:false ,error:error});
      // res.status(400);
      // throw new Error(error.message);
    }
  };


  //Access All Chats
  const allMessages = async (req, res) => {
    try {
      console.log(req.params.chatId)
      const findChat = await Chat.findById(req.params.chatId)
      if(findChat.users.filter(f=>f._id.toString() == req.user_id.toString()).length == 0) return res.status(400).send({status:false,error:"User not the part of this group."}) 
      const messages = await Message.find({ chat: req.params.chatId })
        .populate("sender")
        .populate("chat");
        console.log(req.params.chatId)
        
      res.json(messages);
    } catch (error) {
      res.status(400).send({status:false ,error:error});
      // throw new Error(error.message);
    }
  };

  module.exports = 
  {
    allMessages,
    sendMessage
  }