const redis = require('redis');

// Create a Redis client
const redisClient = redis.createClient({
  url: 'redis://localhost:6380', // Adjust if necessary
  legacyMode:true
});

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

// Export the client
module.exports = { redisClient, connectRedis };