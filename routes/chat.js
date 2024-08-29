const { createAGroup, deleteGroup, getAllGroups, addToGroup, fetchChats, removeUserFromGroup } = require("../controllers/chat")

const router = require("express").Router()


router.post("/group/create",createAGroup)
router.post("/group/delete",deleteGroup)
router.get("/group/get",getAllGroups)
router.post("/group/addtogroup",addToGroup)
router.post("/group/remove",removeUserFromGroup)
router.get("/group/fetch",fetchChats)

module.exports = router