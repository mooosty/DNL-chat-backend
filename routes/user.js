const { getUsers, createUser, loginUser, sendRecoveryLink, activateRecoveryLink, resetPassword, getHash } = require("../controllers/user")
const { protect } = require("../middleware/authProtection")
const router = require("express").Router()


router.get("/all",protect,getUsers)
router.post("/create",createUser)
router.post("/login",loginUser)
router.post("/send-recovery-link",sendRecoveryLink)
router.post("/activate-recovery-link",activateRecoveryLink)
router.post("/reset-password",resetPassword)
router.post("/hash",getHash)


module.exports = router