var express = require('express');
var router = express.Router();
const localStrategy = require(`passport-local`)
const passport = require(`passport`)
const upload = require('./multer');
const userModel = require(`./users`);
const postModel = require(`./post`);
const commentModel = require(`./comments`)
const utils = require(`../utils/utils`);
const { populate } = require('dotenv');


passport.use(new localStrategy(userModel.authenticate()));

router.post(`/register`, function(req, res, next) {
    var newUser = new userModel({
        username: req.body.username,
        fullname: req.body.fullname,
        email: req.body.email,
    })

    userModel.register(newUser, req.body.password)
        .then(function(e) {
            passport.authenticate(`local`)(req, res, function() {
                res.redirect(`/profile`);
            })
        })

    .catch(function(err) {
        res.send(err);
    })

})


router.post(`/login`, passport.authenticate(`local`, {
    successRedirect: `/profile`,
    failureRedirect: `/login`,
    failureFlash: true,
}))


router.get('/logout', IsLoggedIn, function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


function IsLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect(`/login`);
}


router.get('/', function(req, res) {
    res.render('index', { footer: false });
});


router.get('/login', function(req, res) {
    res.render('login', { footer: false, error: req.flash(`error`) });
});

router.get('/feed', IsLoggedIn, async function(req, res) {
    const loginuser = await userModel.findOne({ username: req.session.passport.user });
    const allposts = await postModel.find().populate(`user`).populate(`comments`);
    res.render('feed', { footer: true, loginuser, allposts, dater: utils.formatRelativeTime, });
});

router.get('/profile', IsLoggedIn, async function(req, res) {

    const loginuser = await userModel.findOne({ username: req.session.passport.user }).populate(`posts`);
    res.render('profile', { footer: true, loginuser });
});


router.post(`/uploadprofile`, IsLoggedIn, upload.single(`profile`), async(req, res, next) => {

    const loginuser = await userModel.findOne({ username: req.session.passport.user })
    loginuser.profile = req.file.filename;
    await loginuser.save();
    res.redirect(`/edit`);

})

router.post(`/update`, async(req, res) => {
    const user = await userModel.findOneAndUpdate({ username: req.session.passport.user }, { username: req.body.username, fullname: req.body.name, bio: req.body.bio }, { new: true });

    req.logIn(user, function(err) {
        if (err) throw err;
        res.redirect(`/profile`);
    })
})



router.get('/search', IsLoggedIn, async function(req, res) {
    const loginuser = await userModel.findOne({ username: req.session.passport.user })
    res.render('search', { footer: true, loginuser });
});


router.get(`/users/:input`, IsLoggedIn, async(req, res) => {
    const input = req.params.input;
    const regex = new RegExp(`^${input}`, 'i');
    const users = await userModel.find({ username: regex });
    res.json(users);
})



router.get('/edit', IsLoggedIn, async function(req, res) {
    const loginuser = await userModel.findOne({ username: req.session.passport.user })
    res.render('edit', { footer: true, loginuser });
});

router.get('/upload', IsLoggedIn, async function(req, res) {
    const loginuser = await userModel.findOne({ username: req.session.passport.user })
    res.render('upload', { footer: true, loginuser });
});


router.post(`/upload/post`, IsLoggedIn, upload.single(`image`), async(req, res) => {
    const loginuser = await userModel.findOne({ username: req.session.passport.user })

    const createdpost = await postModel.create({
        caption: req.body.caption,
        image: req.file.filename,
        user: loginuser,
    })

    loginuser.posts.push(createdpost);
    await loginuser.save();

    res.redirect(`/feed`);
})



router.get(`/like/post/:postId`, IsLoggedIn, async(req, res) => {

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
})


router.get(`/openprofile/:username`, IsLoggedIn, async(req, res) => {
    const loginuser = await userModel.findOne({ username: req.session.passport.user });

    const openuser = await userModel.findOne({ username: req.params.username }).populate(`posts`);

    res.render(`openprofile`, { footer: true, loginuser, openuser });
})




router.get(`/save/:postId`, IsLoggedIn, async(req, res) => {
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

})




router.post(`/comment/:data/:postid`, IsLoggedIn, async(req, res) => {
    const commentpost = await postModel.findOne({ _id: req.params.postid })
    const loginuser = await userModel.findOne({ username: req.session.passport.user });

    const createdcomment = await commentModel.create({
        text: req.params.data,
        user: loginuser._id,
        post: commentpost._id
    });

    commentpost.comments.push(createdcomment._id);

    await commentpost.save();
    await loginuser.save();

    // const allcomments = await commentModel.find({ post: commentpost._id }).populate(`user`);
    const onecomment = await commentModel.findOne({ _id: createdcomment._id }).populate(`user`).populate(`post`);
    res.json(onecomment);

})


router.get(`/comments/:postid`, async(req, res, next) => {
    const Post = await postModel.findById({ _id: req.params.postid });
    const comments = await commentModel.find({ post: Post._id }).populate(`user`);
    res.json(comments);

})


router.get(`/previous/comments/:post`, async(req, res, next) => {
    const Post = await postModel.findById({ _id: req.params.post });
    const previousComments = await commentModel.find({ post: Post._id }).populate(`user`);
    if (previousComments.length > 0) {
        res.json(previousComments);
    }

})

// follow and unfollow a user 

router.put(`/follow/:followeruser`, IsLoggedIn, async function(req, res, next) {
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
})




router.get(`/post/likes/:postId`, IsLoggedIn, async(req, res) => {
    const post = await postModel.findById({ _id: req.params.postId }).populate(`likes`).populate(`user`);

    const loginuser = await userModel.findOne({ username: req.session.passport.user })

    res.render(`likedby`, { loginuser, post, footer: true })

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



module.exports = router;