const router = require("express").Router()
const {allMessages, sendMessage,unSendMessage, allMessagesWORedis} = require("../controllers/message")
router.get("/all/:chatId",allMessages)
router.get("/all/wor/:chatId",allMessagesWORedis)
router.post("/send",sendMessage)
router.delete("/unsend/:messageId",unSendMessage)

module.exports = router