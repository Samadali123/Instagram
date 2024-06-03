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
const bcrypt = require("bcrypt");
const GoogleStrategy = require("passport-google-oidc")
const jwt = require("jsonwebtoken")
const { v4: uuidV4 } = require(`uuid`);
const secretKey = process.env.JWT_SECRET_KEY;


// Login with Google Api
router.get('/login/federated/google', passport.authenticate('google'));

passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: '/oauth2/redirect/google',
    scope: ['profile', 'email'],
    passReqToCallback: true // Passes req object to the verify callback
}, async function verify(req, issuer, profile, cb) {
    console.log(profile.emails[0].value)
    let user = await userModel.findOne({ email: profile.emails[0].value });
    if (user) {
        const token = jwt.sign({ email: profile.emails[0].value, userid: user._id },
            secretKey, { algorithm: 'HS256', expiresIn: '1h' }
        );

        // Set token as a cookie using res object from request
        req.res.cookie('token', token, { maxAge: 3600000, httpOnly: true }); // Expires in 1 hour
        return cb(null, user);
    } else {

        const salt = await bcrypt.genSalt(10);
        const password = uuidV4();
        const hashedPassword = await bcrypt.hash(password, salt);
        let newUser = await userModel.create({
            username: profile.displayName,
            email: profile.emails[0].value,
            password: hashedPassword,
        });

        const token = jwt.sign({ email: profile.emails[0].value, userid: newUser._id },
            secretKey, { algorithm: 'HS256', expiresIn: '1h' }
        );

        // Set token as a cookie using res object from request
        req.res.cookie('token', token, { maxAge: 3600000, httpOnly: true }); // Expires in 1 hour
        await newUser.save();
        return cb(null, newUser)
    }
}));

router.get('/oauth2/redirect/google', passport.authenticate('google', {
    successRedirect: '/profile',
    failureRedirect: '/login'
}))


router.post(`/register`, async function(req, res, next) {

    try {
        const { username, fullname, email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (user) {
            return res.status(409).render("user")
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        var newUser = await userModel.create({
            username,
            fullname,
            email,
            password: hashedPassword
        })

        const token = jwt.sign({ email: newUser.email, userid: newUser._id },
            secretKey, { algorithm: 'HS256', expiresIn: '1h' }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.redirect("/profile");
    } catch (error) {
        res.status(500).render("server")
    }


})


router.post("/login", async(req, res, next) => {
    try {
        let { email, password } = req.body
        let user = await userModel.findOne({ email })
        if (!user) return res.status(err.status || 500).render("server");

        bcrypt.compare(password, user.password, function(err, result) {
            if (err) {
                res.status(err.status || 500).json({ success: false, message: err.message })
            } else {
                if (result) {
                    let token = jwt.sign({ email: user.email, userid: user._id }, secretKey);
                    res.cookie("token", token)
                    res.status(401).redirect("/profile")

                } else res.status(400).render("loginError");
            }

        });
    } catch (error) {
        res.status(500).render("server")
    }
})


router.get("/logout", IsLoggedIn, async(req, res, next) => {
    try {
        res.clearCookie("token");
        res.redirect("/login")
    } catch (error) {
        res.status(500).render("server")
    }
})



function IsLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).render("isloggedin");

    }

    try {
        const data = jwt.verify(token, secretKey);
        req.user = data;
        next();
    } catch (err) {

        console.error('Token verification error:', err);
        return res.status(401).render("isloggedin")
    }
}




router.get('/', function(req, res) {
    try {
        res.render('index', { footer: false });
    } catch (error) {
        res.status(500).render("server")
    }
});


router.get('/login', function(req, res) {
    try {
        res.render('login', { footer: false });

    } catch (error) {
        res.status(500).render("server")
    }
});


router.get('/feed', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
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
        res.status(500).render("server")
    }
});


router.get('/profile', IsLoggedIn, async function(req, res) {
    try {

        const loginuser = await userModel.findOne({ email: req.user.email }).populate(`posts`);
        res.render('profile', { footer: true, loginuser });
    } catch (err) {
        res.status(500).render("server")
    }
});


router.post(`/uploadprofile`, IsLoggedIn, upload.single(`profile`), async(req, res, next) => {

    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        loginuser.profile = req.file.filename;
        await loginuser.save();
        res.redirect(`/edit`);
    } catch (err) {
        res.status(500).render("server");
    }

})


router.post(`/edit/profile`, IsLoggedIn, async(req, res) => {
    try {
        const { username, fullname, bio } = req.body;
        const User = await userModel.findOne({ email: req.user.email })
        User.username = username;
        User.fullname = fullname;
        User.bio = bio;
        await User.save();
        res.redirect("/profile")
    } catch (err) {
        res.status(500).render("server");
    }

})



router.get('/search', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('search', { footer: true, loginuser });
    } catch (err) {
        res.status(500).render("server")
    }
});


router.get(`/users/:input`, IsLoggedIn, async(req, res) => {
    try {
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = await userModel.find({ username: regex });
        res.json(users);
    } catch (err) {
        res.status(500).render("server")
    }
})


router.get('/edit', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('edit', { footer: true, loginuser });
    } catch (err) {
        res.status(500).render("server")
    }

});


router.get('/upload', IsLoggedIn, async function(req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('upload', { footer: true, loginuser });
    } catch (err) {
        res.status(500).render("server");
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

        const loginuser = await userModel.findOne({ email: req.user.email });

        const createdpost = await postModel.create({
            caption: req.body.caption,
            image: req.file.filename,
            user: loginuser._id,
        })

        loginuser.posts.push(createdpost);
        await loginuser.save();

        res.redirect(`/feed`);
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})



router.get(`/like/post/:postId`, IsLoggedIn, async(req, res) => {

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
    } catch (err) {
        res.status(500).render("server")
    }
})


router.get(`/openprofile/:username`, IsLoggedIn, async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        const openuser = await userModel.findOne({ username: req.params.username }).populate(`posts`);

        res.render(`openprofile`, { footer: true, loginuser, openuser });
    } catch (err) {
        res.status(500).render("server")
    }
})


router.get(`/save/:postId`, IsLoggedIn, async(req, res) => {
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
    } catch (err) {
        res.status(500).render("server")
    }

})


router.post('/comment/:data/:postid', IsLoggedIn, async(req, res) => {
    try {
        const commentpost = await postModel.findOne({ _id: req.params.postid });
        const loginuser = await userModel.findOne({ email: req.user.email });

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
        res.status(500).render("server")
    }
});

// follow and unfollow a user 

router.put(`/follow/:followeruser`, IsLoggedIn, async function(req, res, next) {
    try {
        const followeduser = await userModel.findOne({ username: req.params.followeruser });

        const followinguser = await userModel.findOne({ email: req.user.email });

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
        res.status(500).render("server")
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

        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render('comments', { header: true, loginuser, comments, post });
    } catch (err) {
        return res.status(500).render("server")
    }
});



router.get(`/post/likes/:postId`, IsLoggedIn, async(req, res) => {
    try {
        const post = await postModel.findById({ _id: req.params.postId }).populate(`likes`).populate(`user`);

        const loginuser = await userModel.findOne({ email: req.user.email })

        res.render(`likedby`, { loginuser, post, footer: true })
    } catch (err) {
        res.status(500).render("server")
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
        res.status(500).render("server")
    }

});


router.get('/followers/:userId', IsLoggedIn, async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followers`, { openprofileuser, loginuser, footer: true });

    } catch (err) {
        res.status(500).render("server")
    }
});


router.get('/followings/:userId', IsLoggedIn, async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followings`, { openprofileuser, loginuser, footer: true });

    } catch (err) {
        res.status(500).render("server")
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
        res.status(500).render("server")
    }
});


router.get(`/search/:openuser/following/:input`, IsLoggedIn, async(req, res) => {
    try {
        const openUser = req.params.openuser;
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const user = await userModel.findOne({ username: openUser }).populate('following');

        if (!user) {
            return res.status(500).render("server")
        }

        const following = user.following.filter(followingUser => regex.test(followingUser.username));
        res.json(following);
    } catch (error) {
        console.error(error);
        res.status(500).render("server")
    }
});


router.put(`/comment/like/:commentID`, IsLoggedIn, async(req, res, next) => {
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
        return res.status(500).render("server")

    }
})


router.post(`/:username/add/story`, IsLoggedIn, upload.single(`storyimage`), async(req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
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
        return res.status(500).render("server")

    }
})


router.get(`/story/:userId/:number`, IsLoggedIn, async(req, res) => {
    try {
        const storyuser = await userModel.findById({ _id: req.params.userId }).populate('stories');
        const storyimage = storyuser.stories[req.params.number];
        const loginuser = await userModel.findOne({ email: req.user.email })

        if (storyuser.stories.length > req.params.number) {
            res.render("story", { footer: false, storyimage, storyuser, number: req.params.number });
        } else {
            res.redirect("/feed");
        }
    } catch (error) {
        return res.status(500).render("server")
    }

})


router.get(`/story/:number`, IsLoggedIn, async(req, res) => {
    try {
        const storyuser = await userModel.findOne({ email: req.user.email }).populate(`stories`)
        const loginuser = await userModel.findOne({ email: req.user.email })
        const storyimage = storyuser.stories[req.params.number];

        if (storyuser.stories.length > req.params.number) {
            res.render("story", { footer: false, storyuser, storyimage, number: req.params.number });
        } else {
            res.redirect("/feed");
        }
    } catch (err) {
        return res.status(500).render("server")

    }

});



module.exports = router;