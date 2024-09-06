const express = require("express")
const dotenv = require("dotenv")
const http = require("http");
const cors = require("cors")
const { dbConnection } = require("./db")
const app = express()
const server = http.createServer(app);
const swaggerDoc = require("swagger-jsdoc")
const setupRoutes = require("./routes");
const { connectRedis, pubClient, subClient, connectRedisClients } = require("./redis/redisClient");
const setupSocket = require("./controllers/socketHandler");
const setupSwagger = require("./swagger/swagger");

// const imageUpload = require("express-fileupload")

dotenv.config()
app.use(cors())
app.use(express.json()); // to accept json data
const port = process.env.PORT
  
//Home endpoint
app.get("/", (req, res) => {
  res.status(200).send({ status: true, response: "OK", error: 0, message: `Environment: ${process.env.NODE_ENV}` })
})
//Connection for DB
dbConnection()
setupRoutes(app);  
setupSwagger(app);
async function startServer() {   
  try {
    await connectRedis();
    setupSocket(server, pubClient, subClient);
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




