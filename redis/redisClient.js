const redis = require('redis');
const { createClient } = require("redis");

// Create a Redis client
const redisClient = redis.createClient({
  url: 'redis://localhost:6380', // Adjust if necessary
  legacyMode: true
});
const pubClient = createClient({ url: 'redis://localhost:6380' });
const subClient = pubClient.duplicate();

// Connect to Redis
async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
    process.exit(1);
  }
}

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Log when the Redis client successfully connects
redisClient.on('ready', () => {
  console.log('Redis client connected');
});

// Graceful shutdown of Redis client
process.on('SIGINT', async () => {
  console.log('Shutting down Redis client');
  await redisClient.quit();
  process.exit(0);
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
// Export the client and connection function

module.exports = { redisClient, connectRedis,publishMessage,connectRedisClients,storeMessageInCache,pubClient,subClient };
