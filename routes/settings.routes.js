const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { settingsPage, savedPostsPage, openSavedPostsPage, archievePage, archieveStoryPage, activityPage, userLikesPage, userCommentsPage, postCommentsPage, openUserLikedPage, deletedContentPage, postsPage, singlePostPage, userHighlightsPage, openHighlightsPage, accountStatusPage, removeContentPage, removeContent, guidelinesPage, contentLoweredPage, featuresPage, aboutUsPage, accountPrivacyPage, accountToggle, resetPassWordAccount, blockUser, blcokedAccountsPage, unblockUser } = require('../controllers/settings.controller');



// settings routes

router.get("/settings", authentication,  settingsPage)


router.get("/saved/posts", authentication,  savedPostsPage)


router.get("/saved/posts/open/:openpost/:openuser", authentication,  openSavedPostsPage);

 

router.get("/archieve/stories", authentication,  archievePage);


router.get(`/archieve/story/:id`, authentication,  archieveStoryPage)


router.get("/activity", authentication,  activityPage)


router.get("/user/likes", authentication,  userLikesPage);



router.get("/user/comments", authentication, userCommentsPage);



router.get('/user/posts/comments/:postId', authentication,  postCommentsPage);


router.get("/liked/posts/:postid/:userid", authentication,  openUserLikedPage)



router.get("/user/deleted/content", authentication,  deletedContentPage)



router.get("/user/posts", authentication,  postsPage)



router.get("/user/posts/open/:postid", authentication,  singlePostPage)



router.get("/user/highlights", authentication,  userHighlightsPage)



router.get("/user/highlights/:highlightId/:number", authentication,  openHighlightsPage);



router.get("/accountstatus", authentication,  accountStatusPage)



router.get("/removecontent", authentication,  removeContentPage)



router.get('/content/removed', authentication , removeContent);



router.get("/guidelines", authentication,  guidelinesPage)



router.get("/contentlowered", authentication,  contentLoweredPage)



router.get("/featuresnotuse", authentication, featuresPage)



router.get("/aboutus", authentication,  aboutUsPage);




router.get("/account/privacy", authentication,  accountPrivacyPage);



router.get("/account/toggle", authentication, accountToggle);



router.put("/restpassword", authentication,  resetPassWordAccount)




router.put("/block/user", authentication,  blockUser);



router.get("/blocked/accounts", authentication,  blcokedAccountsPage)



router.put('/unblock/user', authentication,  unblockUser);




module.exports = router;