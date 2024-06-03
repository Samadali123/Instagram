var express = require('express');
var router = express.Router();
const localStrategy = require(`passport-local`)
const passport = require(`passport`)
const upload = require('./multer');
const userModel = require(`./users`);
const postModel = require(`./post`);
const storyModel = require(`./story`);
const commentModel = require(`./comments`)
const utils = require(`../utils/utils`);





passport.use(new localStrategy(userModel.authenticate()));

router.post(`/register`, async function(req, res, next) {
    const { username, fullname, email, password } = req.body;

    try {

        if (!username || !email || !fullname || !password) {
            return res.status(403).json({ success: false, message: "Please Enter Details for registered account" })

        }
        var newUser = new userModel({
            username: username,
            fullname: fullname,
            email: email,
        })

        const User = await userModel.findOne({ username: username })
        if (User) {
            return res.status(403).json({ success: false, message: "User already registered" })

        }

        userModel.register(newUser, password)
            .then(function(e) {
                passport.authenticate(`local`)(req, res, function() {
                    res.redirect(`/profile`);
                })
            })


        .catch(function(err) {
            res.status(403).json({ message: err.message })
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }


})


router.post(`/login`, passport.authenticate(`local`, {
    successRedirect: `/profile`,
    failureRedirect: `/login`,
    failureFlash: true,
}))


router.get('/logout', IsLoggedIn, function(req, res, next) {
    try {
        req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })

    }

});


function IsLoggedIn(req, res, next) {
    try {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect(`/login`);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }


}


router.get('/', function(req, res) {
    res.render('index', { footer: false });
});


router.get('/login', function(req, res) {
    res.render('login', { footer: false, error: req.flash(`error`) });
});


router.get('/feed', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user });
        const allposts = await postModel.find().populate(`user`).populate(`comments`);

        // Fetch all stories excluding those related to the login user
        const allstory = await storyModel.find({ user: { $ne: loginuser._id } }).populate(`user`);

        // Filter unique user stories
        const obj = {};
        const userStories = allstory.filter(story => {
            if (!obj[story.user._id]) {
                obj[story.user._id] = true;
                return true;
            }
            return false;
        });

        res.render('feed', { footer: true, loginuser, allposts, userStories, dater: utils.formatRelativeTime });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.get('/profile', IsLoggedIn, async function(req, res) {
    try {

        const loginuser = await userModel.findOne({ username: req.session.passport.user }).populate(`posts`);
        res.render('profile', { footer: true, loginuser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.post(`/uploadprofile`, IsLoggedIn, upload.single(`profile`), async(req, res, next) => {

    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        loginuser.profile = req.file.filename;
        await loginuser.save();
        res.redirect(`/edit`);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

})

router.post(`/update`, async(req, res) => {
    try {
        const user = await userModel.findOneAndUpdate({ username: req.session.passport.user }, { username: req.body.username, fullname: req.body.name, bio: req.body.bio }, { new: true });
        req.logIn(user, function(err) {
            if (err) throw err;
            res.redirect(`/profile`);
        })
    } catch (err) {

        res.status(500).json({ success: false, message: err.message });
    }

})



router.get('/search', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        res.render('search', { footer: true, loginuser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.get(`/users/:input`, IsLoggedIn, async(req, res) => {
    try {
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = await userModel.find({ username: regex });
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})



router.get('/edit', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        res.render('edit', { footer: true, loginuser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

});


router.get('/upload', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        res.render('upload', { footer: true, loginuser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.post(`/upload/post`, IsLoggedIn, upload.single(`image`), async(req, res) => {
    try {

        if (!req.body.caption || !req.file) {
            return res.status(400).json({ success: false, message: "Caption is required and image must be selected" });
        }

        if (!req.body.caption) {
            return res.status(400).json({ success: false, message: "Caption is required for a post" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image is required for a post" });

        }

        const loginuser = await userModel.findOne({ username: req.session.passport.user })

        const createdpost = await postModel.create({
            caption: req.body.caption,
            image: req.file.filename,
            user: loginuser,
        })

        loginuser.posts.push(createdpost);
        await loginuser.save();

        res.redirect(`/feed`);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})



router.get(`/like/post/:postId`, IsLoggedIn, async(req, res) => {

    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        const post = await postModel.findById({ _id: req.params.postId }).populate(`user`);

        if (post.likes.indexOf(loginuser._id) === -1) {
            post.likes.push(loginuser._id);

        } else {
            post.likes.splice(post.likes.indexOf(loginuser._id), 1);

        }

        await post.save();
        await loginuser.save();

        res.json(post);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})


router.get(`/openprofile/:username`, IsLoggedIn, async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user });

        const openuser = await userModel.findOne({ username: req.params.username }).populate(`posts`);

        res.render(`openprofile`, { footer: true, loginuser, openuser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})


router.get(`/save/:postId`, IsLoggedIn, async(req, res) => {
    try {
        const user = await userModel.findOne({ username: req.session.passport.user });
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
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

})


router.post('/comment/:data/:postid', IsLoggedIn, async(req, res) => {
    try {
        const commentpost = await postModel.findOne({ _id: req.params.postid });
        const loginuser = await userModel.findOne({ username: req.session.passport.user });

        const createdcomment = await commentModel.create({
            text: req.params.data,
            user: loginuser._id,
            post: commentpost._id
        });

        commentpost.comments.push(createdcomment._id);
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
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// follow and unfollow a user 

router.put(`/follow/:followeruser`, IsLoggedIn, async function(req, res, next) {
    try {
        const followeduser = await userModel.findOne({ username: req.params.followeruser });

        const followinguser = await userModel.findOne({ username: req.session.passport.user });

        if (followeduser.followers.indexOf(followinguser._id) === -1) {
            followeduser.followers.push(followinguser._id);
        } else {
            followeduser.followers.splice(followinguser.followers.indexOf(followinguser._id), 1);
        }


        if (followinguser.following.indexOf(followeduser._id) === -1) {
            followinguser.following.push(followeduser._id);
        } else {
            followinguser.following.splice(followeduser.following.indexOf(followinguser._id), 1);
        }

        await followeduser.save();
        await followinguser.save();

        res.json(followinguser);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})


router.get('/view/comments/:postId', IsLoggedIn, async(req, res, next) => {
    try {
        const post = await postModel.findById(req.params.postId);
        const comments = await commentModel.find({ post: post._id }).populate('user');

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

        const loginuser = await userModel.findOne({ username: req.session.passport.user });
        res.render('comments', { header: true, loginuser, comments, post });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});



router.get(`/post/likes/:postId`, IsLoggedIn, async(req, res) => {
    try {
        const post = await postModel.findById({ _id: req.params.postId }).populate(`likes`).populate(`user`);

        const loginuser = await userModel.findOne({ username: req.session.passport.user })

        res.render(`likedby`, { loginuser, post, footer: true })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }

});


router.get(`/post/likes/users/:postId/:input`, IsLoggedIn, async(req, res) => {
    try {
        const post = await postModel.findById(req.params.postId);
        await post.populate('likes');
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = post.likes.filter(like => regex.test(like.username));
        res.json(users);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }

});


router.get('/followers/:userId', async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followers`, { openprofileuser, loginuser, footer: true });

    } catch (err) {
        res.status(200).send({ message: "Error while fetching the followers of this user" })
    }
});


router.get('/followings/:userId', async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followings`, { openprofileuser, loginuser, footer: true });

    } catch (err) {
        res.status(200).send({ message: "Error while fetching the followings of this user" })
    }
});



router.get(`/search/:openuser/followers/:input`, IsLoggedIn, async(req, res) => {
    try {
        const openUser = req.params.openuser;
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const user = await userModel.findOne({ username: openUser }).populate('followers');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const followers = user.followers.filter(follower => regex.test(follower.username));
        res.json(followers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.get(`/search/:openuser/following/:input`, IsLoggedIn, async(req, res) => {
    try {
        const openUser = req.params.openuser;
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const user = await userModel.findOne({ username: openUser }).populate('following');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const following = user.following.filter(followingUser => regex.test(followingUser.username));
        res.json(following);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put(`/comment/like/:commentID`, IsLoggedIn, async(req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
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
        return res.status(500).json({ success: false, error: error });

    }
})

router.post(`/:username/add/story`, IsLoggedIn, upload.single(`storyimage`), async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        if (!req.file.filename) {
            return res.status(403).json({ success: false, message: "Please upload a image uploading a Story" })

        }
        const newStory = await storyModel.create({
            user: loginuser._id,
            image: req.file.filename,
        })
        loginuser.stories.push(newStory._id);
        await loginuser.save();


        res.status(302).redirect(`/feed`);


    } catch (error) {
        return res.status(err.status).json({ success: false, message: "Internal Server Errror" });

    }
})



router.get(`/story/:userId/:number`, IsLoggedIn, async(req, res) => {
    try {
        const storyuser = await userModel.findById({ _id: req.params.userId }).populate('stories');
        const storyimage = storyuser.stories[req.params.number];
        const loginuser = await userModel.findOne({ username: req.session.passport.user })

        if (storyuser.stories.length > req.params.number) {
            res.render("story", { footer: false, storyimage, storyuser, number: req.params.number });
        } else {
            res.redirect("/feed");
        }
    } catch (error) {
        return res.status(err.status).json({ success: false, message: error.message });
    }

})


router.get(`/story/:number`, IsLoggedIn, async(req, res) => {
    try {
        const storyuser = await userModel.findOne({ username: req.session.passport.user }).populate(`stories`)
        const loginuser = await userModel.findOne({ username: req.session.passport.user })
        const storyimage = storyuser.stories[req.params.number];

        if (storyuser.stories.length > req.params.number) {
            res.render("story", { footer: false, storyuser, storyimage, number: req.params.number });
        } else {
            res.redirect("/feed");
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })

    }

});



module.exports = router;