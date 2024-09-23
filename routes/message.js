const router = require("express").Router()
const {allMessages, sendMessage,unSendMessage, allMessagesWORedis, addReaction, markMessageAsRead} = require("../controllers/message")
router.get("/all/:chatId",allMessages)
router.get("/all/wor/:chatId",allMessagesWORedis)  
router.post("/send",sendMessage)
router.delete("/unsend/:messageId",unSendMessage)
router.post("/react",addReaction)    


module.exports = router   