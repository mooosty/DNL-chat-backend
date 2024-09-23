const { createAdapter } = require("@socket.io/redis-adapter");
const { storeMessageInCache, publishMessage, storeReactionInCache, incrementUnreadCount, resetUnreadCount, markMessageAsSeen } = require("../redis/redisClient");

function setupSocket(server, pubClient, subClient) {
  const io = require("socket.io")(server, {
    pingTimeout: 60000, 
    cors: {
      origin: "http://localhost:3000",  
    },       
  });             
                      
  // Adapter setup       
  io.adapter(createAdapter(pubClient, subClient));
                                                  
  // Socket.IO connection setup
  io.on("connection", (socket) => {
    socket.on("setup",async (userData) => {
      console.log(`${userData.data._id} Connected to socket.io`);  
      socket.join(userData.data._id);
      socket.emit("connected");  

       // Get unread counts for all chats the user is part of
       const userChats = userData.chats || [];
       for (const chat of userChats) {
         const unreadCount = await getUnreadCount(userData.data._id, chat._id);
         socket.emit("unreadCountUpdate", { chatId: chat._id, unreadCount });
       }
    });

    socket.on("joinRequest", (groupId, adminId) => {
      io.to(adminId).emit("newJoinRequest", { groupId, message: "User requested to join your group!" });
      console.log(`Join request for group ${groupId} sent to admin ${adminId}`);
    });
   
    socket.on("join chat", async (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);

      // Reset unread message count when user joins the chat
      const userId = socket.id; // Or get the userId from the connected socket
      await resetUnreadCount(userId, room); // Reset the count for the specific chat
      console.log(`Unread messages for user ${userId} in room ${room} reset to 0.`);
    });

    socket.on("typing", ({ room, username }) => {
      socket.in(room).emit("typing", { username });
      console.log(username, " is typing.");
    });

    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", async (newMessageReceived) => {
      const chat = newMessageReceived.chat;
      if (!chat.users) return console.log("chat.users not defined");
    
      const senderId = newMessageReceived.sender._id; // Get the sender's ID
    
      // Iterate through each user in the chat
      for (const user of chat.users) {
        if (user._id === senderId) continue; // Skip the sender
    
        const isUserInRoom = socket.rooms.has(user._id); // Check if the user is in the chat room
    
        if (!isUserInRoom) {
          // Increment unread count for the user in the specific chat
          const unreadCount = await incrementUnreadCount(user._id, chat._id);
    
          // Emit unread count update to the user
          io.to(user._id).emit("unreadCountUpdate", { chatId: chat._id, unreadCount });
        }
    
        // Send the new message to the user
        socket.in(user._id).emit("message received", newMessageReceived);
        console.log("New message received", newMessageReceived, "\nUser: ", user._id);
      }
    
      try {
        // Cache the message in Redis
        await storeMessageInCache(chat._id, newMessageReceived);
        // Publish the message to the Redis channel for caching
        await publishMessage(`messages:${chat._id}`, newMessageReceived);
      } catch (error) {
        console.error("Error caching or publishing message:", error);
      }
    });
    

    socket.on("leavegroup", async (newMessageReceived) => {
      const chat = newMessageReceived.chat;
      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id == newMessageReceived.sender._id) return;

        socket.in(user._id).emit("userleavegroup", newMessageReceived);
        console.log("User left the group", newMessageReceived, "\nUser: ", user._id);
      });

      try {
        // Cache the message in Redis
        await storeMessageInCache(chat._id, newMessageReceived);
        // Publish the message to the Redis channel for caching
        await publishMessage(`messages:${chat._id}`, newMessageReceived);
      } catch (error) {
        console.error("Error caching or publishing message:", error);
      }
    });

    socket.on("message unsent", async (data) => {
      const { messageId, chatId } = data;
      console.log("In unsend message");

      try {
        // Optionally update Redis to reflect the unsent message
        // await removeMessageFromCache(chatId, messageId);

        io.in(chatId).emit("message unsent", { messageId, chatId });
        console.log(`Message ${messageId} in chat ${chatId} was unsent`);
      } catch (error) {
        console.error("Error handling unsend message:", error);
      }
    });

    // Add reaction event
    socket.on("addReaction", async (reactionData) => {
      const { messageId, chatId, reaction, userId } = reactionData;

      if (!messageId || !chatId || !reaction || !userId) {
        return console.error("Invalid reaction data received");
      }

      console.log("Adding reaction:", reactionData);  // Log reaction data

      try {
        // Broadcast the reaction to other users in the chat
        io.in(chatId).emit("reaction added", reactionData);

        // Cache the reaction in Redis
        await storeReactionInCache(chatId, messageId, reactionData);

        // Publish the reaction event for other nodes to cache it
        await publishMessage(`reactions:${chatId}`, reactionData);
      } catch (error) {
        console.error("Error handling reaction:", error);   
      }
    });     
    socket.on("messageSeen", async ({ chatId, messageId }) => {
      // const userId = socket.user._id;  // Assume userId is attached to the socket
      const userId = socket.id; // Or get the userId from the connected socket

      console.log(`User ${userId} has seen message ${messageId} in chat ${chatId}`);
    
      try {
        // Mark the message as seen in Redis
        await markMessageAsSeen(messageId, userId);
    
        // Notify other users in the chat that the message has been seen
        io.in(chatId).emit("messageSeenUpdate", { messageId, userId });
    
      } catch (error) {
        console.error("Error marking message as seen:", error);
      }
    });
    

    socket.off("setup", () => {
      console.log("USER DISCONNECTED");
      socket.leave(userData.data._id);
    });
  });
}

module.exports = setupSocket;

