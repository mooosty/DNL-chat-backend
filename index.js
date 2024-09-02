const express = require("express")
const dotenv = require("dotenv")
const http = require("http");
const cors = require("cors")
const { dbConnection } = require("./db")
const app = express()
const server = http.createServer(app);
const swaggerUI = require("swagger-ui-express")
const swaggerDoc = require("swagger-jsdoc")
const YAML = require('yamljs');
const path = require("path")
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const pubClient = createClient({ url: 'redis://localhost:6380' });
const subClient = pubClient.duplicate();

dotenv.config()
app.use(cors())
app.use(express.json()); // to accept json data
const port = process.env.PORT

//Connection for DB
dbConnection()

//Protection Api middleware
const { protect } = require("./middleware/authProtection");

//Home endpoint
app.get("/", (req, res) => {
  res.status(200).send({ status: true, response: "OK", error: 0, message: `Environment: ${process.env.NODE_ENV}` })
})

const user = require("./routes/user")
const chat = require("./routes/chat");
const message = require("./routes/message");
const { connectRedis, redisClient } = require("./redis/redisClient");

//Endpoints
app.use("/user", user)
app.use("/chat", protect, chat)
app.use("/message", protect, message)



//SOCKET IO CONNECTION SETUP
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

// Function to publish messages to Redis
const publishMessage = async (channel, message) => {
  try {
    await pubClient.publish(channel, JSON.stringify(message));
    console.log(`Published message to ${channel}:`, message);
  } catch (error) {
    console.error('Error publishing message:', error);
  }
};
subClient.on('error', (err) => {
  console.error('Redis error:', err);
});
async function connectRedisClients() {
  try {
    await pubClient.connect();
    await subClient.connect();
    console.log('Redis clients connected.');
  } catch (error) {
    console.error('Error connecting Redis clients:', error);
  }
}
io.adapter(createAdapter(pubClient, subClient));
{
   
io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    console.log(`${userData.data._id} Connected to socket.io`);
    socket.join(userData.data._id);
    socket.emit("connected");
  });

  // SocketIO real-time message send/receive typing/stopped-typing will be coded below
  // SocketIO client will be used in frontend (probably react) to establish the connection with our socket server

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  // socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("typing", ({ room, username }) => {
    socket.in(room).emit("typing", { username });
    console.log(username," is typing.")
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
  
  

 
  //Socket for message deleted so chat should be refreshed
  socket.on("message unsent", (data) => {
    const { messageId, chatId } = data;
    console.log("in unsend message")
    // Emit the message unsent event to all users in the chat
    io.in(chatId).emit("message unsent", { messageId, chatId });
    console.log(`Message ${messageId} in chat ${chatId} was unsent`);
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
}
const options = {
  definition:{
    openapi:"3.0.0",
    info:{

      title:"Darknight APIs Documentation",
    },
    servers:[
      {
        url:"http:localhost:4500"
      }
    ]
  },
  apis:["./routes/*.js"]
}
// const swagger = swaggerDoc(options)
const swagger = YAML.load(path.join(__dirname, 'swagger.yaml'));

const storeMessageInCache = async (chatId, newMessage) => {
  try {
    const cacheKey = `messages:${chatId}`;
    
    // Retrieve the existing messages
    const messagesStr = await redisClient.get(cacheKey,async(err,result)=>{
      if(err)
      {
        console.log("failed to add cache")
      }
      else{
        let messages = [];
    
        if (result) {
          messages = JSON.parse(result);
        }

        console.log(result)
        // Add the new message to the array
        messages.push(newMessage);
        
        // Store the updated array back in Redis
        await redisClient.set(cacheKey, JSON.stringify(messages),(err,response)=>{
          if(err)
            {
              console.log("failed to add cache")
            }
            else{
              console.log(`New message added and cached under key ${cacheKey}`);

            }
        });
      }
    });
  } catch (error) {
    console.error('Error adding new message to cache:', error);
  }
};


app.use("/api-docs",
  swaggerUI.serve,
  swaggerUI.setup(swagger)
)
// ...

async function startServer() {
  try {
    await connectRedis();
    // Start the server
    server.listen(port, () => {
      console.log(`Project Enabled Environment: ${process.env.NODE_ENV}`);
      console.log(`Project is Live At: http://localhost:${process.env.PORT}`);
      console.log("Socket enabled.");
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

//Allow server to be exposed on PORT 
startServer();
connectRedisClients()
// server.listen(port, () => {
//   console.log(`Project Enabled Environment: ${process.env.NODE_ENV}`)
//   console.log(`Project is Live At: http://localhost:${process.env.PORT}`)
//   console.log("Socket enabled.")
// })

