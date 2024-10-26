const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth")
const upload = require("../utils/multer");
const { addStory, usersStoryPage, loginuserStoryPage, likeStory, deleteStory } = require('../controllers/story.controller');



// add story 
router.post(`/:username/add/story`, [authentication,upload.single(`storyimage`)],  addStory )

// get nornal user story 
router.get(`/story/:userId/:number`, authentication, usersStoryPage )

// get loginuser story page
router.get(`/story/:number`, authentication,  loginuserStoryPage);

// like story
router.put("/story/like/:StoryId", authentication,  likeStory);

// delete story
router.delete("/story/delete/:StoryId", authentication,deleteStory);




module.exports = router;