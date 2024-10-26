const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { followersPage, followAndUnfollow, followingsPage, loginuserFollowersPage, loginuserFollowingsPage, removeLoginuserFollower, searchUserFollowers, searchUserFollowings } = require('../controllers/follow.controller');

// follow and unfollow
router.put(`/follow/:followeruser`, authentication, followAndUnfollow)

// get user followers page
router.get('/followers/:userId', authentication, followersPage);

// get user followings page
router.get('/followings/:userId', authentication, followingsPage);

// get login user followers page
router.get('/myfollowers', authentication, loginuserFollowersPage);

// get login user followings page
router.get('/myfollowing', authentication,  loginuserFollowingsPage);

// remove loginuser followers 
router.delete("/myfollowers/remove/:id", authentication, removeLoginuserFollower)

// search user followers using input
router.get(`/search/:openuser/followers/:input`, authentication, searchUserFollowers);

// search user followings using input
router.get(`/search/:openuser/following/:input`, authentication, searchUserFollowings);




module.exports = router;