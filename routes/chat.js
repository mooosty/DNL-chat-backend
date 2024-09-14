const { 
    createAGroup, 
    deleteGroup, 
    getAllGroups, 
    addToGroup, 
    fetchChats, 
    removeUserFromGroup, 
    requestInvite, 
    respondToInvite} =
     require("../controllers/chat")

const router = require("express").Router()


router.post("/group/create",createAGroup)
router.post("/group/delete",deleteGroup)
router.get("/group/get",getAllGroups)
router.post("/group/addtogroup",addToGroup)
router.post("/group/remove",removeUserFromGroup)
router.get("/group/fetch",fetchChats)
router.post("/group/invite",respondToInvite)
router.post("/group/invite/request",requestInvite)

module.exports = router