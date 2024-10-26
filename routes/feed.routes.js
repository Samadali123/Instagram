const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { feedPage, searchUsersPage, searchUsers, openUserProfilePage } = require('../controllers/feed.controller');


// feed page
router.get("/feed", authentication,  feedPage)

// seach users page
router.get("/search", authentication, searchUsersPage)

// seach user on input
router.get("/users/:input", authentication, searchUsers)

// openProfile user page
router.get("/openprofile/:username", authentication, openUserProfilePage)





module.exports = router;