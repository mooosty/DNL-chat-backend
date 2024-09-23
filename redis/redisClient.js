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
  const cacheKey = `messages:${chatId}`;

  try {
    // Retrieve the existing messages from Redis
    let messagesStr = await redisClient.get(cacheKey);

    let messages = [];
    if (messagesStr) {
      // Parse existing messages
      messages = JSON.parse(messagesStr);
    }

    // Add the new message to the array
    messages.push(newMessage);

    // Store the updated array back in Redis
    await redisClient.set(cacheKey, JSON.stringify(messages));
    
    console.log(`New message added and cached under key ${cacheKey}`);

  } catch (error) {
    console.error('Error adding new message to cache:', error);
  }
};

const storeReactionInCache = async (chatId, messageId, reactionData) => {
  try {
    const cacheKey = `reactions:${chatId}`;
    console.log(`Fetching reactions from cache with key: ${cacheKey}`);
    
    const result = await redisClient.get(cacheKey);
    let reactions = [];

    if (result) {
      reactions = JSON.parse(result);
    }

    console.log(`Current reactions in cache:`, reactions);
    
    const message = reactions.find((msg) => msg.messageId === messageId);

    if (message) {
      console.log(`Found existing message with reactions, adding new reaction: ${reactionData}`);
      message.reactions.push(reactionData);
    } else {
      console.log(`Message not found in cache, creating new entry.`);
      reactions.push({
        messageId: messageId,
        reactions: [reactionData],
      });
    }

    await redisClient.set(cacheKey, JSON.stringify(reactions));
    console.log(`Reaction added and cached under key ${cacheKey}`);
  } catch (error) {
    console.error("Error adding reaction to cache:", error);
  }
};

// Increment unread message count in Redis
const incrementUnreadCount = async (userId, chatId) => {
  const cacheKey = `unreadCount:${userId}:${chatId}`;
  try {
    const currentCount = await redisClient.get(cacheKey);
    const updatedCount = currentCount ? parseInt(currentCount) + 1 : 1;
    await redisClient.set(cacheKey, updatedCount);
    return updatedCount;
  } catch (error) {
    console.error('Error incrementing unread count:', error);
  }
};

// Reset unread message count when the user views the chat
const resetUnreadCount = async (userId, chatId) => {
  const cacheKey = `unreadCount:${userId}:${chatId}`;
  try {
    await redisClient.set(cacheKey, 0);
  } catch (error) {
    console.error('Error resetting unread count:', error);
  }
};

// Get unread message count for a specific chat
const getUnreadCount = async (userId, chatId) => {
  const cacheKey = `unreadCount:${userId}:${chatId}`;
  try {
    const count = await redisClient.get(cacheKey);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
  }
};      

// Mark message as seen in Redis
const markMessageAsSeen = async (messageId, userId) => {
  const cacheKey = `messageSeen:${messageId}`;
  try {
    // Add the userId to the set of users who have seen the message
    await redisClient.sAdd(cacheKey, userId);
    console.log(`User ${userId} marked as having seen message ${messageId}`);
  } catch (error) {
    console.error('Error marking message as seen in Redis:', error);
  }
};      

// Get the list of users who have seen the message
const getMessageSeenBy = async (messageId) => {
  const cacheKey = `messageSeen:${messageId}`;
  try {
    // Get all the users who have seen this message
    const seenBy = await redisClient.sMembers(cacheKey);
    return seenBy;  // Returns an array of user IDs
  } catch (error) {
    console.error('Error getting message seen status from Redis:', error);
    return [];
  }
};           
             
// Export the client and connection function

module.exports = { 
  redisClient, 
  connectRedis, 
  publishMessage, 
  connectRedisClients, 
  storeMessageInCache, 
  storeReactionInCache, 
  incrementUnreadCount, 
  resetUnreadCount, 
  getUnreadCount, 
  markMessageAsSeen,
  getMessageSeenBy,
  pubClient, 
  subClient 
};