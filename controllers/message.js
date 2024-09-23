const Chat = require("../models/chat");
const Message = require("../models/message");
const User = require("../models/user");
const { redisClient, getMessageSeenBy } = require("../redis/redisClient");



const sendMessage = async (req, res) => {
  const { content, chatId, isImage, isVideo, isDocument } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.status(400).send({ status: false, error: "Invalid data passed into request" });
  }
  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    isImage: isImage || false,
    isVideo: isVideo || false,
    isDocument: isDocument || false,
  };
  const findChat = await Chat.findById(chatId)
  if (!findChat) return res.status(404).send({ status: false, message: "No such chat exists." })

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name  email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    // Update unread counts for other users
    const otherUsers = findChat.users.filter(user => user.toString() !== req.user._id.toString());
    await User.updateMany(
      { _id: { $in: otherUsers } },
      { $inc: { unreadCount: 1 } } // Assuming you have an `unreadCount` field in your model
    );

    res.json(message);
  } catch (error) {
    res.status(400).send({ status: false, error: error });
    // res.status(400);
    // throw new Error(error.message);
  }
};

const updateMessageInRedis = async (messageId, updatedFields, content, userId) => {
  if (!redisClient.isOpen) {
    throw new Error('Redis client is not connected');
  }
  const messageKey = `messages:${messageId}`;
  const messageStr = await redisClient.get(messageKey, async (err, result) => {
    if (err) {
      console.log(err)
    }
    else {
      const message = JSON.parse(result)

      const index = message.findIndex(msg => msg._id === updatedFields._id.toString());
      if (index !== -1) {
        // console.log(message[index],"before")
        message[index].isDeleted = true; // Update the isDelete field to true
        message[index].deletedBy = userId
        message[index].content = content
        redisClient.setex(messageKey, 3600, JSON.stringify(message), (err) => {
          if (err) {
            console.error('Error setting cache in Redis:', err);
          }
          console.log("Cache set");
        });
      } else {
        console.error('Message ID not found in Redis:', messageKey);
        return;
      }
    }
  });
};


//un-send message
const unSendMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId)
    if (!message) return res.status(404).send({ status: false, error: "Message not found." })
    if (message.isDeleted) return res.status(400).send({ status: false, error: "This message was already deleted." })
    const groupChat = await Chat.findById(message.chat._id)

    // Allow specific user and admin to delete a specific message
    if (message.sender._id.toString() === req.user._id.toString() || groupChat.groupAdmin._id == req.user._id.toString()) {
      const resultDelete = await Message.findByIdAndUpdate(req.params.messageId, {
        $set: {
          isDeleted: true,
          deletedBy: req.user._id
        }
      }, {
        new: true
      })
      const responsible = req.user._id.toString() === groupChat.groupAdmin._id.toString() ? "Admin" : req.user.name;
      console.log(resultDelete.sender, "sender")
      const deleteText = `This message has been deleted by ${responsible}.`
      // Update the message in Redis
      await updateMessageInRedis(message.chat._id, message, deleteText, req.user._id);


      return res.status(201).send({ status: true, message: "Message was successfully unsent." })
    }
    return res.status(401).send({ status: false, error: "You can only un-send your own message." })

  } catch (error) {
    res.status(500).send({ status: false, message: "Internal server error.", error: error })
    console.log(error)
  }
}

//Add reaction on single message
const addReaction = async (req, res) => {
  const { messageId, reactionType, remove } = req.body;
  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(400).send({ status: false, error: "Message not found." });

    }

    // Check if the user has already reacted with the same type
    const existingReaction = message.reactions.find(
      (reaction) => reaction.user.toString() === req.user._id.toString()
    );

    if (remove && typeof remove === "boolean") {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (reaction) => !(reaction.user.toString() === req.user._id.toString())
      );
    } else {
      if (existingReaction) {
        // Update reaction
        existingReaction.type = reactionType;
      } else {
        // Add the new reaction
        message.reactions.push({ type: reactionType, user: req.user._id });
      }
    }

    // Save the message to MongoDB
    await message.save();

    // Update Redis cache
    const cacheKey = `messages:${message.chat}`;
    redisClient.get(cacheKey, (err, result) => {
      if (err) {
        console.error('Error fetching from Redis:', err);
      } else {
        let messages = JSON.parse(result) || [];
        const index = messages.findIndex(m => m._id === messageId);

        if (index !== -1) {
          // Update the cached message with the new reactions
          messages[index].reactions = message.reactions;
          redisClient.setex(cacheKey, 3600, JSON.stringify(messages), (err) => {
            if (err) {
              console.error('Error setting cache in Redis:', err);
            } else {
              console.log("Cache updated with new reactions");
            }
          });
        }
      }
    });

    res.status(200).send({ status: true, message: "Reaction updated" });
  } catch (error) {
    res.status(500).send({ status: false, message: "Internal server error.", error: error });
  }
};


const countReactionsIndividually = (reactions, type) => {
  return reactions.filter(f => f.type == type).length
}


//Get messages without redis cache
const allMessagesWORedis = async (req, res) => {
  try {
    console.log(req.params.chatId)
    const findChat = await Chat.findById(req.params.chatId)
    if (findChat.users.filter(f => f.toString() == req.user._id.toString()).length == 0) return res.status(400).send({ status: false, error: "User not the part of this group." })
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender")
      .populate("chat");
    // console.log(req.params.chatId,findChat.users.filter)
    const finalDisplay = messages.map(m => {
      m.reactionsCount = {
        totalCount: m.reactions.length,
        like: countReactionsIndividually(m.reactions, "like"),
        love: countReactionsIndividually(m.reactions, "love"),
        haha: countReactionsIndividually(m.reactions, "haha"),
        wow: countReactionsIndividually(m.reactions, "wow"),
        sad: countReactionsIndividually(m.reactions, "sad"),
        angry: countReactionsIndividually(m.reactions, "angry"),
      }
      if (m.isDeleted) {
        const responsible = m.deletedBy._id.toString() == findChat.groupAdmin._id.toString() ? "Admin" : m.sender.name
        m.content = `This message has been deleted by ${responsible}`
      }
      return m
    })

    res.json(finalDisplay);
  } catch (error) {
    res.status(400).send({ status: false, error: error });
    throw new Error(error.message);
  }
};

// with radis
const allMessages = async (req, res) => {       
  const chatId = req.params.chatId;                    

  try {
    // Check if Redis client is connected
    if (!redisClient.isOpen) {
      throw new Error('Redis client is not connected');
    }  
    console.log("Fetching cached messages from Redis");
    const cachedMessages = await new Promise((resolve, reject) => {
      console.log("inside cached promise")
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
        .populate("sender", "name username profilePhoto")
        .populate("chat")
        .lean() // Fetch as plain JS objects
        .catch((err) => {
          console.error('Error fetching messages from MongoDB:', err);
          return [];
        });   
      console.log("Messages fetched");          
           
      // Fetch seen status for each message
      // for (const message of messages) {
      //   const seenBy = await getMessageSeenBy(message._id);
      //   message.seenBy = seenBy;  // Attach the seenBy field to the message   
      // }

      // Manually populate `readBy` after using .lean()
      for (const message of messages) {
        message.readBy = await User.find({ _id: { $in: message.readBy } })
          .select("username profilePhoto")
          .lean();   
      }
      const finalDisplay = messages.map(m => {
        m.reactionsCount = {
          totalCount: m.reactions.length,
          like: countReactionsIndividually(m.reactions, "like"),
          love: countReactionsIndividually(m.reactions, "love"),
          haha: countReactionsIndividually(m.reactions, "haha"),
          wow: countReactionsIndividually(m.reactions, "wow"),
          sad: countReactionsIndividually(m.reactions, "sad"),
          angry: countReactionsIndividually(m.reactions, "angry"),

        }
        if (m.isDeleted) {
          const responsible = m.deletedBy._id.toString() == findChat.groupAdmin._id.toString() ? "Admin" : m.sender.name
          m.content = `This message has been deleted by ${responsible}`
        }

        return m
      })

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


module.exports =
{
  allMessages,
  sendMessage,
  unSendMessage,
  allMessagesWORedis,
  addReaction,
}
