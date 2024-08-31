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
const message = require("./routes/message")

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
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
      console.log("new message received", newMessageRecieved,"\n user: ",user._id)
    });
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

app.use("/api-docs",
  swaggerUI.serve,
  swaggerUI.setup(swagger)
)
//Allow server to be exposed on PORT 
server.listen(port, () => {
  console.log(`Project Enabled Environment: ${process.env.NODE_ENV}`)
  console.log(`Project is Live At: http://localhost:${process.env.PORT}`)
  console.log("Socket enabled.")
})

