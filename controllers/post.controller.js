const userModel = require("../models/user.model")
const postModel = require("../models/post.model")
const commentModel = require("../models/comments.model")


exports.uploadPostPage = async (req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('upload', { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.uploadPost  = async(req, res) => {
    try {

        if (!req.body.caption || !req.file) {
            return res.status(400).json({ success: false, message: "Caption is required and image must be selected" });
        }

        if (!req.body.caption) {
            return res.status(400).json({ success: false, message: "Caption is required for a post" });
        }

        // if (!req.file) {
        //     return res.status(400).json({ success: false, message: "Image is required for a post" });

        // }
        if (!req.file.path) {
            return res.status(400).json({ success: false, message: "Image path  is required for a post" });

        }

        const loginuser = await userModel.findOne({ email: req.user.email });

        const createdpost = await postModel.create({
            caption: req.body.caption,
            // image: req.file.filename,
            image: req.file.path,
            user: loginuser._id,
        })

        loginuser.posts.push(createdpost);
        await loginuser.save();

        res.redirect(`/feed`);

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.likePost = async(req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const post = await postModel.findById({ _id: req.params.postId }).populate(`user`);

        if (post.likes.indexOf(loginuser._id) === -1) {
            post.likes.push(loginuser._id);

        } else {
            post.likes.splice(post.likes.indexOf(loginuser._id), 1);

        }

        await post.save();
        await loginuser.save();
        
        res.json(post);
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.savePost = async(req, res)=>{
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const post = await postModel.findById({ _id: req.params.postId });

        if (user.savedPosts.indexOf(post._id) === -1) {
            user.savedPosts.push(post._id);

        } else {
            user.savedPosts.splice(user.savedPosts.indexOf(post._id), 1);
        }


        if (post.savedBy.indexOf(user._id) === -1) {
            post.savedBy.push(user._id);
        } else {
            post.savedBy.splice(post.savedBy.indexOf(user._id), 1);
        }

        await user.save();
        await post.save();

        res.json(post);
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.addComment = async (req, res)=>{
    try {
        const commentpost = await postModel.findOne({ _id: req.params.postid });
        const loginuser = await userModel.findOne({ email: req.user.email });

        const createdcomment = await commentModel.create({
            text: req.params.data,
            user: loginuser._id,
            post: commentpost._id
        });

        commentpost.comments.push(createdcomment._id);
        loginuser.commentPost.push(commentpost._id);
        await commentpost.save();
        await loginuser.save();

        // Fetch the newly created comment with populated user and post fields
        const onecomment = await commentModel.findOne({ _id: createdcomment._id }).populate('user').populate('post');

        // Format the created date for the newly created comment
        let dateObj = new Date(onecomment.createdAt);
        let monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        let day = dateObj.getDate();
        let month = dateObj.getMonth() + 1;
        let year = dateObj.getFullYear();

        let monthName = monthNames[month];
        let formattedDate = `${monthName} ${day}, ${year}`;
        onecomment.formattedDate = formattedDate;
        res.json(onecomment);
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.viewPostComment = async (req, res)=>{
    try {
        const post = await postModel.findById(req.params.postId);
        const comments = await commentModel.find({ post: post._id }).populate('user')

        comments.forEach((comment) => {
            let dateObj = new Date(comment.createdAt);
            let monthNames = [
                '', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            let day = dateObj.getDate();
            let month = dateObj.getMonth() + 1;
            let year = dateObj.getFullYear();

            let monthName = monthNames[month];
            let formattedDate = `${monthName} ${day}, ${year}`;
            comment.formattedDate = formattedDate;
        });

        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render('comments', { header: true, loginuser, comments, post });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.likedPostPage  = async (req, res)=>{
    try {
        // const post = await postModel.findById({ _id: req.params.postId }).populate(`likes`).populate(`user`, 'stories');
        const post = await postModel.findById(req.params.postId)
            .populate('likes')
            .populate({
                path: 'user',
                select: '_id stories' // _id is always included by default, so this will include _id and stories
            });

        const loginuser = await userModel.findOne({ email: req.user.email })

        res.render(`likedby`, { loginuser, post, footer: true })
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.likedPostUserSearch = async(req, res)=>{
    try {
        const post = await postModel.findById(req.params.postId);
        await post.populate('likes');
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = post.likes.filter(like => regex.test(like.username));
        res.json(users);
    } catch (error) {  
        console.error(error);
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.likeComment = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const comment = await commentModel.findOne({ _id: req.params.commentID });
        const length = comment.likes.length;


        if (comment.likes.indexOf(loginuser._id) === -1) {
            comment.likes.push(loginuser._id);

        } else {
            comment.likes.splice(comment.likes.indexOf(loginuser._id), 1);
        }

        await loginuser.save()
        await comment.save();
        res.status(200).json({ success: true, length });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")

    }
}


exports.openRandomUserPostPage  = async (req, res) => {
    try {
        // Fetch the logged-in user and open user details
        const loginuser = await userModel.findOne({ email: req.user.email })
            .populate("followers")
            .populate("following")
            .populate("blockedUsers");  // Ensure blockedUsers is populated

        const openUser = await userModel.findById(req.params.openuser)
            .populate("followers")
            .populate("following");

        // Find the specific open post and populate its user
        const openPost = await postModel.findById(req.params.openpost).populate("user");
        if (!openPost) return res.status(403).json({ message: "Post not found!" });

        // Find random posts excluding blocked users and users with private accounts
        const count = await postModel.countDocuments({
            user: { $nin: loginuser.blockedUsers },  // Exclude blocked users
        });

        const randomIndex = Math.floor(Math.random() * count);

        const randomPosts = await postModel.find({
            user: { $nin: loginuser.blockedUsers }  // Exclude blocked users
        })
            .skip(randomIndex)
            .limit(19)
            .populate({
                path: "user",
                match: { privateAccount: false }  // Only include users whose privateAccount is false
            });

        // Filter out posts where the user is null (due to match excluding some users)
        const filteredRandomPosts = randomPosts.filter(post => post.user);

        // Combine the openPost with the filtered random posts
        let posts = [openPost, ...filteredRandomPosts];

        // Render the page with posts, loginuser, openUser, and footer
        res.render("openpost", { footer: true, posts, loginuser, openUser, dater: utils.formatRelativeTime });

    } catch (error) {
        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}


exports.openLoginUserPostPage  = async (req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        // const openPost = await postModel.findById(req.params.openpost).populate("user").populate("comments");
        const openPost = await postModel.findById(req.params.openpost)
            .populate("user")
            .populate({
                path: 'comments',
                select: '_id text',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });


        if (!openPost) return res.status(403).json({ message: "Post not found!" });


        const userPosts = await postModel.find({ user: loginuser._id, _id: { $ne: openPost._id } }).sort({ createdAt: -1 }).populate("user").populate({
            path: 'comments',
            select: '_id text',
            populate: {
                path: 'user',
                select: 'username'
            }
        });

        let insertIndex = 0;
        for (let i = 0; i < userPosts.length; i++) {
            if (userPosts[i].createdAt < openPost.createdAt) {
                insertIndex = i;
                break;
            }
        }


        const posts = [...userPosts];
        posts.splice(insertIndex, 0, openPost);

        const limitedPosts = posts.slice(0, 20);

        res.render("myposts", {
            footer: true,
            posts: limitedPosts,
            openPost,
            loginuser,
            dater: utils.formatRelativeTime
        });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.postCommentToggle = async (req, res)=>{
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.commentsEnabled = !post.commentsEnabled;
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}


exports.postLikeToggle = async(req, res)=>{
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.hidelikes = !post.hidelikes;
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}


exports.postPinnedToggle = async (req, res) => {
    try {

        const loginUser = await userModel.findOne({ email: req.user.email }).populate('posts');


        if (!loginUser) {
            return res.status(404).json({ error: 'User not found' });
        }


        const post = await postModel.findById(req.params.id);


        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }


        const postIndex = loginUser.posts.findIndex(p => p._id.toString() === req.params.id);


        if (postIndex === -1) {
            return res.status(404).json({ error: 'Post not found in user\'s posts' });
        }

        if (post.pinned) {

            post.pinned = false;


            const removedPost = loginUser.posts.splice(postIndex, 1)[0];

            const insertIndex = post.originalIndex >= 0 && post.originalIndex < loginUser.posts.length ? post.originalIndex : loginUser.posts.length;
            loginUser.posts.splice(insertIndex, 0, removedPost);


            post.originalIndex = -1;
        } else {

            post.pinned = true;

            post.originalIndex = postIndex;


            const removedPost = loginUser.posts.splice(postIndex, 1)[0];

            loginUser.posts.unshift(removedPost);
        }


        await post.save();
        await loginUser.save();

        res.redirect("/profile")

    } catch (error) {

        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}


exports.editPostPage = async (req, res)=>{
    try {
        const post = await postModel.findById(req.params.id).populate("user")
        if (!post) return res.status(403).json({ message: "Post not found" })

        const loginuser = await userModel.findOne({ email: req.user.email })

        let dateObj = new Date(post.createdAt);
        let monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        let day = dateObj.getDate();
        let month = dateObj.getMonth() + 1;
        let year = dateObj.getFullYear();

        let monthName = monthNames[month];
        let formattedDate = `${monthName} ${day}, ${year}`;
        post.formattedDate = formattedDate;

        res.render("editpost", { post, loginuser, footer: true })
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.editPost = async (req, res)=>{
    try {
        const { caption } = req.body;
        if (!caption || caption.trim() === "") {
            return res.status(400).json({ error: 'Caption cannot be empty' });
        }
        const post = await postModel.findOneAndUpdate({ _id: req.params.id }, { $set: { caption } }, { new: true });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.redirect("/profile");
    } catch (error) {
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}


exports.deletePost = async (req, res)=>{
    try {
        const post = await postModel.findByIdAndDelete(req.params.id)
        const loginuser = await userModel.findOne({ email: req.user.email })
        if (!post) return res.status(403).json({ message: "Post not found !" });
        loginuser.deletedContent.push(post);
        await loginuser.save();
        res.redirect("/profile");
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


