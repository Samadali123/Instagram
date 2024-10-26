const express = require('express');
const router = express.Router();
const upload = require("../utils/multer")

const {authentication} = require("../middlewares/auth");
const { uploadPostPage, uploadPost, likePost, savePost, addComment, viewPostComment, likedPostPage, likedPostUserSearch, likeComment, openRandomUserPostPage, openLoginUserPostPage, postCommentToggle, postLikeToggle, postPinnedToggle, editPostPage, editPost, deletePost } = require('../controllers/post.controller');


// post upload page
router.get("/upload", authentication, uploadPostPage )

// upload post
router.post("/upload/post", [authentication, upload.single(`image`)], uploadPost)

// like post
router.get("/like/post/:postId", authentication, likePost)

//  save post
router.get("/save/:postId", authentication, savePost)

// add comment on post
router.post("/comment/:data/:postid", authentication, addComment)

// view post comments
router.get("/view/comments/:postId'", authentication, viewPostComment)

// post liked by page
router.get("/post/likes/:postId", authentication, likedPostPage)


// liked post user search
router.get("/post/likes/users/:postId/:input", authentication, likedPostUserSearch)

// like comment on a post
router.put("/comment/like/:commentID", authentication, likeComment)

// open profile user open post
router.get("/posts/open/:openpost/:openuser", authentication, openRandomUserPostPage)


// open login user post
router.get("/myposts/open/:openpost", authentication, openLoginUserPostPage)

// comment toggle on a post
router.put("/comments/toggle/:id'", authentication, postCommentToggle)

// post like toggle enabled or disabled
router.put("/likes/toggle/:id'", authentication, postLikeToggle)

// post pin toggle 
router.put("/posts/pin/:id", authentication, postPinnedToggle)

// edit post page
router.get("/posts/edit/:id", authentication, editPostPage)

// edit post
router.post("/posts/edit/:id", authentication, editPost)

// delete post
router.get("/posts/delete/:id", authentication, deletePost)





module.exports = router;