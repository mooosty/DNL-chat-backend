const router = require("express").Router()
const {allMessages, sendMessage,unSendMessage} = require("../controllers/message")
router.get("/all/:chatId",allMessages)
router.post("/send",sendMessage)
router.delete("/unsend/:messageId",unSendMessage)

module.exports = router