const { getUsers, createUser, loginUser } = require("../controllers/user")
const { protect } = require("../middleware/authProtection")
const router = require("express").Router()


router.get("/all",protect,getUsers)
router.post("/create",createUser)
router.post("/login",loginUser)


module.exports = router