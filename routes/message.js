const router = require("express").Router()
const {allMessages, sendMessage} = require("../controllers/message")
router.get("/all/:chatId",allMessages)
router.post("/send",sendMessage)

module.exports = router