const { createAdapter } = require("@socket.io/redis-adapter");
const { storeMessageInCache, publishMessage, storeReactionInCache } = require("../redis/redisClient");

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
    socket.on("setup", (userData) => {
      console.log(`${userData.data._id} Connected to socket.io`);
      socket.join(userData.data._id);
      socket.emit("connected");
    });      

    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);
    });

    socket.on("typing", ({ room, username }) => {
      socket.in(room).emit("typing", { username });
      console.log(username, " is typing.");
    });

    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", async (newMessageRecieved) => {
      var chat = newMessageRecieved.chat;
      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id == newMessageRecieved.sender._id) return;

        socket.in(user._id).emit("message recieved", newMessageRecieved);
        console.log("new message received", newMessageRecieved, "\n user: ", user._id);
      });

      // Cache the message in Redis
      await storeMessageInCache(chat._id, newMessageRecieved);
      // Publish the message to the Redis channel for caching
      await publishMessage(`messages:${chat._id}`, newMessageRecieved);
    });

    socket.on("message unsent", (data) => {
      const { messageId, chatId } = data;   
      console.log("in unsend message");
      io.in(chatId).emit("message unsent", { messageId, chatId });
      console.log(`Message ${messageId} in chat ${chatId} was unsent`);
    });           

     // Add reaction event            
     socket.on("addReaction", async (reactionData) => {
      const { messageId, chatId, reaction, userId } = reactionData;
          
      // Broadcast the reaction to other users in the chat
      io.in(chatId).emit("reaction added", reactionData);

      // Cache the reaction in Redis
      await storeReactionInCache(chatId, messageId, reactionData);

      // Publish the reaction event for other nodes to cache it
      await publishMessage(`reactions:${chatId}`, reactionData);
    });
    
    socket.off("setup", () => {
      console.log("USER DISCONNECTED");
      socket.leave(userData._id);
    });
  });
}

module.exports = setupSocket;
