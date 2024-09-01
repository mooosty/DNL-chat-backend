const Chat = require( "../models/chat");
const Message =require( "../models/message");
const User= require("../models/user");
const { redisClient } = require("../redis/redisClient");
// const redisClient = require("../redis/redisClient");



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
  // Access All Chats and paginate
  const allMessagesWORedis = async (req, res) => {
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

  
  // const allMessages = async (req, res) => {
  //   const chatId = req.params.chatId;
  
  //   try {
  //     console.log(chatId, "trying");
  
  //     // Use Promises for Redis operations
  //     const cachedMessages = await new Promise((resolve, reject) => {
  //       redisClient.get(`messages:${chatId}`, (err, result) => {
  //         if (err) {
  //           console.error('Error fetching from Redis:', err);
  //           return reject(err);
  //         }
  //         resolve(result);
  //       });
  //     });
  
  //     if (cachedMessages) {
  //       console.log("Cache hit");
  //       return res.json(JSON.parse(cachedMessages));
  //     } else {
  //       console.log("Cache miss");
  //       // Fetch from MongoDB
  //       const findChat = await Chat.findById(chatId);
  //       if (!findChat || findChat.users.filter(f => f.toString() === req.user._id.toString()).length === 0) {
  //         return res.status(400).send({ status: false, error: "User not part of this group." });
  //       }
  
  //       const messages = await Message.find({ chat: chatId })
  //         .populate("sender")
  //         .populate("chat");
  
  //       const finalDisplay = messages.map(m => {
  //         if (m.isDeleted) {
  //           const responsible = m.deletedBy._id.toString() === findChat.groupAdmin._id.toString() ? "Admin" : m.sender.name;
  //           m.content = `This message has been deleted by ${responsible}`;
  //         }
  //         return m;
  //       });
  
  //       console.log("Setting cache");
  //       await new Promise((resolve, reject) => {
  //         redisClient.setex(`messages:${chatId}`, 3600, JSON.stringify(finalDisplay), (err) => {
  //           if (err) {
  //             console.error('Error setting cache in Redis:', err);
  //             return reject(err);
  //           }
  //           resolve();
  //         });
  //       });
  
  //       return res.json(finalDisplay);
  //     }
  //   } catch (error) {
  //     console.error("Error in allMessages:", error);
  //     res.status(400).send({ status: false, error: error.message });
  //   }
  // };
  
  const allMessages = async (req, res) => {
    const chatId = req.params.chatId;
  
    try {
        // Check if Redis client is connected
        if (!redisClient.isOpen) {
          throw new Error('Redis client is not connected');
        }
      console.log("Fetching cached messages from Redis");
      const cachedMessages = await new Promise((resolve, reject) => {
        console.log("inside cacched promise")
        redisClient.get(`messages:${chatId}`, (err, result) => {
          // return res.send({err:err,result:result})
          if (err) {
            console.error('Error fetching from Redis:', err);
            return reject(err);
          }
          console.log("Cached messages fetched");
          resolve(result);
        });
      }).catch((err) => {
        console.error('Error fetching from Redis:', err);
        return null;
      });
  // console.log(red,"red")
      console.log("Cached messages:", cachedMessages);
  
      if (cachedMessages) {
        console.log("Cache hit");
        return res.json(JSON.parse(cachedMessages));
      } else {
        console.log("Cache miss");
        // Fetch from MongoDB
        console.log("Fetching chat from MongoDB");
        const findChat = await Chat.findById(chatId).catch((err) => {
          console.error('Error fetching chat from MongoDB:', err);
          return null;
        });
        console.log("Chat fetched");
        if (!findChat || findChat.users.filter(f => f.toString() === req.user._id.toString()).length === 0) {
          return res.status(400).send({ status: false, error: "User not part of this group." });
        }
  
        console.log("Fetching messages from MongoDB");
        const messages = await Message.find({ chat: chatId })
          .populate("sender")
          .populate("chat").catch((err) => {
            console.error('Error fetching messages from MongoDB:', err);
            return [];
          });
        console.log("Messages fetched");
  
        const finalDisplay = messages.map(m => {
          if (m.isDeleted) {
            const responsible = m.deletedBy._id.toString() === findChat.groupAdmin._id.toString() ? "Admin" : m.sender.name;
            m.content = `This message has been deleted by ${responsible}`;
          }
          return m;
        });
  
        console.log("Setting cache");
        await new Promise((resolve, reject) => {
          redisClient.setex(`messages:${chatId}`, 3600, JSON.stringify(finalDisplay), (err) => {
            if (err) {
              console.error('Error setting cache in Redis:', err);
              return reject(err);
            }
            console.log("Cache set");
            resolve();
          });
        }).catch((err) => {
          console.error('Error setting cache in Redis:', err);
        });
  
        return res.json(finalDisplay);
      }
    } catch (error) {
      console.error("Error in allMessages:", error);
      res.status(400).send({ status: false, error: error.message });
    }
  };
  
  
  // module.exports = allMessages;
  

  // const allMessages = async (req, res) => {
  //   try {
  //     const { chatId } = req.params;
  //     const { page = 1, limit = 20 } = req.query; // Default to page 1 and limit 20 if not provided
  
  //     console.log(chatId);
  
  //     const findChat = await Chat.findById(chatId);
  //     if (findChat.users.filter(f => f.toString() === req.user._id.toString()).length === 0) {
  //       return res.status(400).send({ status: false, error: "User not part of this group." });
  //     }
  
  //     // Convert page and limit to integers
  //     const pageNumber = parseInt(page, 10);
  //     const pageSize = parseInt(limit, 10);
  
  //     // Calculate the number of messages to skip
  //     const skip = (pageNumber - 1) * pageSize;
  
  //     // Fetch messages with pagination
  //     const messages = await Message.find({ chat: chatId })
  //       .skip(skip)
  //       .limit(pageSize)
  //       .populate("sender")
  //       .populate("chat");
  
  //     const finalDisplay = messages.map(m => {
  //       if (m.isDeleted) {
  //         const responsible = m.deletedBy._id.toString() === findChat.groupAdmin._id.toString() ? "Admin" : m.sender.name;
  //         m.content = `This message has been deleted by ${responsible}`;
  //       }
  //       return m;
  //     });
  
  //     // Fetch total message count for pagination information
  //     const totalMessages = await Message.countDocuments({ chat: chatId });
  
  //     res.json({
  //       messages: finalDisplay,
  //       totalMessages,
  //       currentPage: pageNumber,
  //       totalPages: Math.ceil(totalMessages / pageSize)
  //     });
  //   } catch (error) {
  //     res.status(400).send({ status: false, error: error.message });
  //     throw new Error(error.message);
  //   }
  // };
  

  module.exports = 
  {
    allMessages,
    sendMessage,
    unSendMessage,
    allMessagesWORedis
  }