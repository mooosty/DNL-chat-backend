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

//un-send message
const unSendMessage = async (req,res)=>{
  try {
    const message = await Message.findById(req.params.messageId)
    if(!message) return res.status(404).send({status:false, error:"Message not found."})
    if(message.isDeleted) return res.status(400).send({status:false, error:"This message was already deleted."})
      const groupChat = await Chat.findById(message.chat._id)

    // Allow specific user and admin to delete a specific message
    if(message.sender._id.toString()===req.user._id.toString() || groupChat.groupAdmin._id == req.user._id.toString() )
    {
      await Message.findByIdAndUpdate(req.params.messageId,{
        $set:{
          isDeleted:true,
          deletedBy:req.user._id
        }
      })
      return res.status(201).send({status:true,message:"Message was successfully unsent."})
    }
    return res.status(401).send({status:false, error:"You can only un-send your own message."})

  } catch (error) {
    res.status(500).send({status:false,message:"Internal server error.", error:error})
    console.log(error)
  }
}
  //Access All Chats
  const allMessages = async (req, res) => {
    try {
      console.log(req.params.chatId)
      const findChat = await Chat.findById(req.params.chatId)
      if(findChat.users.filter(f=>f.toString() == req.user._id.toString()).length == 0) return res.status(400).send({status:false,error:"User not the part of this group."}) 
      const messages = await Message.find({ chat: req.params.chatId })
        .populate("sender")
        .populate("chat");
        // console.log(req.params.chatId,findChat.users.filter)
        const finalDisplay = messages.map(m=>{
          if(m.isDeleted)
          {
            const responsible =m.deletedBy._id.toString()==findChat.groupAdmin._id.toString()?"Admin":m.sender.name
            m.content= `This message has been deleted by ${responsible}`
          }
          return m
        })
        
      res.json(finalDisplay);
    } catch (error) {
      res.status(400).send({status:false ,error:error});
      throw new Error(error.message);
    }
  };

  module.exports = 
  {
    allMessages,
    sendMessage,
    unSendMessage
  }