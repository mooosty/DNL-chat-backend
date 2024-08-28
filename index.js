const express = require("express")
const dotenv = require("dotenv")
const http = require("http");
const cors = require("cors")
const { dbConnection } = require("./db")
const app = express()
const server = http.createServer(app);

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
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  // SocketIO real-time message send/receive typing/stopped-typing will be coded below
  // SocketIO client will be used in frontend (probably react) to establish the connection with our socket server

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (data) => {
    // Broadcast typing info to all users in the chat room
    socket.to(data.chatId).emit("typing", { user: data.user });
    console.log(data, "is typing")
  });
   // socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
      console.log("new message received", newMessageRecieved.content)
    });
  });
 

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});

//Allow server to be exposed on PORT 
server.listen(port, () => {
  console.log(`Project Enabled Environment: ${process.env.NODE_ENV}`)
  console.log(`Project is Live At: http://localhost:${process.env.PORT}`)
  console.log("Socket enabled.")
})

