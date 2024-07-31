var express = require('express');
var router = express.Router();
const localStrategy = require(`passport-local`)
const passport = require(`passport`)
const upload = require('./multer');
const userModel = require(`./users`);
const postModel = require(`./post`);
const storyModel = require(`./story`);
const commentModel = require(`./comments`)
const HighlightModel = require("./highlights")
const utils = require(`../utils/utils`);
const bcrypt = require("bcrypt");
const GoogleStrategy = require("passport-google-oidc")
const jwt = require("jsonwebtoken")
const { v4: uuidV4 } = require(`uuid`);
const secretKey = process.env.JWT_SECRET_KEY;
const nodemailer = require("nodemailer");
const highlights = require('./highlights');



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


router.post(`/register`, async function (req, res, next) {

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
        res.status(500).json({ error })
    }


})


router.post("/login", async (req, res, next) => {
    try {
        let { email, password } = req.body
        let user = await userModel.findOne({ email })
        if (!user) return res.status(err.status || 500).render("server");

        bcrypt.compare(password, user.password, function (err, result) {
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
        res.status(500).json({ error })
    }
})


router.get("/logout", auth, async (req, res, next) => {
    try {
        res.clearCookie("token");
        res.redirect("/login")
    } catch (error) {
        res.status(500).json({ error })
    }
})



function auth(req, res, next) {
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




router.get('/', function (req, res) {
    try {
        res.render('index', { footer: false });
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get('/login', function (req, res) {
    try {
        res.render('login', { footer: false });

    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get('/feed', auth, async function (req, res) {
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
    } catch (error) {
        res.status(500).json({message: error.message});
    }
});


router.get('/profile', auth, async function (req, res) {
    try {

        const loginuser = await userModel.findOne({ email: req.user.email }).populate(`posts`).populate("highlights")
    
        res.render('profile', { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.post(`/uploadprofile`, auth, upload.single(`profile`), async (req, res, next) => {

    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        loginuser.profile = req.file.filename;
        await loginuser.save();
        res.redirect(`/edit`);
    } catch (error) {
        res.status(500).json({ error })
    }

})


router.post(`/edit/profile`, auth, async (req, res) => {
    try {
        const { username, fullname, bio } = req.body;
        const User = await userModel.findOne({ email: req.user.email })
        User.username = username;
        User.fullname = fullname;
        User.bio = bio;
        await User.save();
        res.redirect("/profile")
    } catch (error) {
        res.status(500).json({ error })
    }

})



router.get('/search', auth, async function (req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('search', { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get(`/users/:input`, async (req, res) => {
    try {
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = await userModel.find({ username: regex });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get('/edit', auth, async function (req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('edit', { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error })
    }

});


router.get('/upload', auth, async function (req, res) {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('upload', { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.post(`/upload/post`, auth, upload.single(`image`), async (req, res) => {
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

    } catch (error) {
        res.status(500).json({ error })
    }
})



router.get(`/like/post/:postId`, auth, async (req, res) => {

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
        res.status(500).json({ error })
    }
})


router.get(`/openprofile/:username`, auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        const openuser = await userModel.findOne({ username: req.params.username }).populate(`posts`);

        res.render(`openprofile`, { footer: true, loginuser, openuser });
    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get(`/save/:postId`, auth, async (req, res) => {
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
        res.status(500).json({ error })
    }

})



router.post('/comment/:data/:postid', auth, async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error })
    }
});


// follow and unfollow a user 

router.put(`/follow/:followeruser`, auth, async function (req, res, next) {
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
    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get('/view/comments/:postId', auth, async (req, res, next) => {
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
        res.status(500).json({ error })
    }
});



router.get(`/post/likes/:postId`, auth, async (req, res) => {
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
        res.status(500).json({ error })
    }

});


router.get(`/post/likes/users/:postId/:input`, auth, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.postId);
        await post.populate('likes');
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');
        const users = post.likes.filter(like => regex.test(like.username));
        res.json(users);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error })
    }

});


router.get('/followers/:userId', auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followers`, { openprofileuser, loginuser, footer: true });

    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get('/myfollowers', auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")
        res.render(`myfollowers`, { loginuser, footer: true });

    } catch (error) {
        res.status(500).json({ error })
    }
});



router.get('/followings/:userId', auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followings`, { openprofileuser, loginuser, footer: true });

    } catch (error) {
        res.status(500).json({ error })
    }
});



router.get('/myfollowing', auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following");

        res.render(`myfollowing`, { loginuser, footer: true });
    } catch (error) {
        res.status(500).json({ error })
    }
});



router.delete("/myfollowers/remove/:id", auth, async (req, res, next) => {
    try {
        const followertodelete = await userModel.findById(req.params.id).populate("following")


        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers")
        loginuser.followers.splice(loginuser.followers.indexOf(followertodelete._id), 1);

        followertodelete.following.splice(followertodelete.following.indexOf(loginuser._id), 1);

        await loginuser.save();
        await followertodelete.save();

        res.json(loginuser.followers);
    } catch (error) {
        res.status(500).json({ error })

    }
})


router.get(`/search/:openuser/followers/:input`, auth, async (req, res) => {
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
        res.status(500).json({ error })
    }
});


router.get(`/search/:openuser/following/:input`, auth, async (req, res) => {
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

        res.status(500).json({ error })
    }
});


router.put(`/comment/like/:commentID`, auth, async (req, res, next) => {
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
        res.status(500).json({ error })

    }
})


router.post(`/:username/add/story`, auth, upload.single(`storyimage`), async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("myStories")

        if (!req.file.filename) {
            return res.status(403).json({ success: false, message: "Please upload a image uploading a Story" })

        }
        const newStory = await storyModel.create({
            user: loginuser._id,
            image: req.file.filename,
        })
        loginuser.stories.push(newStory._id);

        loginuser.myStories.push(newStory._id);
        await loginuser.save();
        res.status(302).redirect(`/feed`);
    } catch (error) {
        res.status(500).json({ error })

    }
})


router.get(`/story/:userId/:number`, auth, async (req, res) => {
    try {
        const storyuser = await userModel.findById({ _id: req.params.userId }).populate('stories');
        const storyimage = storyuser.stories[req.params.number];
        const loginuser = await userModel.findOne({ email: req.user.email })

        if (storyuser.stories.length > req.params.number) {
            res.render("userstory", { footer: false, storyimage, storyuser, loginuser: false, number: req.params.number, dater: utils.formatRelativeTime });
        } else {
            res.redirect("/feed");
        }
    } catch (error) {
        res.status(500).json({ error })
    }

})


router.get(`/story/:number`, auth, async (req, res) => {
    try {
        const storyuser = await userModel.findOne({ email: req.user.email }).populate(`stories`)
        const loginuser = await userModel.findOne({ email: req.user.email })
        const storyimage = storyuser.stories[req.params.number];
        
        if (storyuser.stories.length > req.params.number) {
            res.render("mystory", { footer: false, storyuser, loginuser: true, storyimage, number: req.params.number, dater: utils.formatRelativeTime });
        } else {
            res.redirect("/feed");
        }
    } catch (error) {
        res.status(500).json({ error })

    }

});



router.put("/story/like/:StoryId", auth, async (req, res, next) => {
    try {
        const storyId = req.params.StoryId;
        // Validate if storyId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: "Invalid StoryId" });
        }

        const likedStory = await storyModel.findById(storyId);
        if (!likedStory) {
            return res.status(404).json({ error: "Story not found" });
        }

        const loginUser = await userModel.findOne({ email: req.user.email });
        if (!loginUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const userIndexInLikes = likedStory.likes.indexOf(loginUser._id);
        const storyIndexInUserLikes = loginUser.likedstories.indexOf(likedStory._id);

        if (userIndexInLikes === -1) {
            // User hasn't liked the story yet
            likedStory.likes.push(loginUser._id);
            loginUser.likedstories.push(likedStory._id);
        } else {
            // User already liked the story, so unlike it
            likedStory.likes.splice(userIndexInLikes, 1);
            loginUser.likedstories.splice(storyIndexInUserLikes, 1);
        }

        await likedStory.save();
        await loginUser.save();

        res.json(likedStory);
    } catch (error) {
        res.status(500).json({ error })
    }
});



router.delete("/story/delete/:StoryId", auth, async (req, res, next) => {
    try {
        const storyId = req.params.StoryId;

        // Validate if storyId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: "Invalid StoryId" });
        }

        const storyToDelete = await storyModel.findById(storyId);
        if (!storyToDelete) {
            return res.status(404).json({ error: "Story not found" });
        }

        const loginUser = await userModel.findOne({ email: req.user.email });
        if (!loginUser) {
            return res.status(404).json({ error: "User not found" });
        }

        await storyModel.findByIdAndDelete(storyId);
        res.json({ message: "Story successfully deleted", story: storyToDelete });

    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get("/forgot-password", async (req, res, next) => {
    try {
        res.render("forgotpassword")
    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/posts/open/:openpost/:openuser", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")

        const openUser = await userModel.findById(req.params.openuser).populate("followers").populate("following")

        const openPost = await postModel.findById(req.params.openpost).populate("user");
        if (!openPost) return res.status(403).json({ message: "Post not found!" });

        const count = await postModel.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);
        const randomPosts = await postModel.find().skip(randomIndex).limit(19).populate("user");


        const posts = [openPost, ...randomPosts];
        res.render("openpost", { footer: true, posts, loginuser, openUser, dater: utils.formatRelativeTime })
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get("/myposts/open/:openpost", auth, async (req, res, next) => {
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
        res.status(500).json({ error })
    }
});




router.post("/forgotpassword", async (req, res, next) => {
    try {

        const { email } = req.body;
        const User = await userModel.findOne({ email })

        if (!User) {
            return res.status(403).render("server");
        } else {

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.Email,
                    pass: process.env.Password
                }
            });


            var mailOptions = {
                from: process.env.Email, // Use the email you want to send from
                to: email, // Make sure this field matches the recipient's email
                subject: `Forget your Instagram Password? Reset now using link given below`,
                html: `
                    <a style="color: royalblue; font-size:18px; font-weight:600; text-decoration:none;" href="http://localhost:3000/reset-password">Reset Password</a>
                `
            }


            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    return res.send(error)
                }
                res.redirect("/sent-successfully");
            })

            User.resetpasswordtoken = "1";
            await User.save();
        }

    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/sent-successfully", async (req, res, next) => {
    try {
        res.render("sentmail")

    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/reset-password", async (req, res, next) => {
    try {
        res.render("resetpassword")
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.post("/resetpassword", async (req, res, next) => {
    try {
        const { email, newPassword } = req.body; // Assuming newPassword is sent in the request
        const User = await userModel.findOne({ email });

        if (!User) {
            return res.json({ error: "User not Found" });
        }
        // Check if the reset password token is not equal to "1"
        if (User.resetpasswordtoken === "1") {

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, salt);

            // Update the user's password
            const updatedUser = await userModel.findOneAndUpdate({ _id: User._id }, // Target the user by ID
                { password: hashedNewPassword }, { new: true }
            );

            // Generate JWT token
            const token = jwt.sign({ email: User.email, userid: User._id },
                secretKey, { algorithm: 'HS256', expiresIn: '1h' }
            );


            // Set the JWT token in a cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            updatedUser.resetpasswordtoken = "0";

            // Redirect to the homepage or another page
            res.redirect("/profile");
        } else {
            return res.status(500).json({ message: "Invalid Reset Password link, Please try again letter" });

        }
        // Uncomment or adjust as needed

    } catch (error) {
        res.status(500).json({ error }) // Send a more informative message
    }
});




router.put('/comments/toggle/:id', auth, async (req, res, next) => {
    try {

        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.commentsEnabled = !post.commentsEnabled;
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/likes/toggle/:id', auth, async (req, res, next) => {
    try {

        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.hidelikes = !post.hidelikes;
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put("/posts/pin/:id", auth, async (req, res, next) => {
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

        res.status(500).json({ error });
    }
});



router.get("/posts/edit/:id", auth, async (req, res, next) => {
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
        res.status(500).json({ error })
    }
})




router.post("/posts/edit/:id", auth, async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});




router.get("/posts/delete/:id", auth, async (req, res, next) => {
    try {
        const post = await postModel.findByIdAndDelete(req.params.id)

        if (!post) return res.status(403).json({ message: "Post not found !" })
        res.redirect("/profile")

    } catch (error) {
        res.status(500).json({ error })
    }
});




router.get("/createnote", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render("createnote", { loginuser, footer: true })

    } catch (error) {
        res.status(500).json({ error })
    }
})



router.post("/createnote", auth, async (req, res, next) => {
    try {
        await userModel.findOneAndUpdate({ email: req.user.email }, { $set: { note: req.body.note } }, { new: true })
        res.redirect("/profile");

    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/deletenote", auth, async (req, res, next) => {
    try {
        await userModel.findOneAndUpdate({ email: req.user.email }, { $set: { note: "" } }, { new: true })
        res.redirect("/profile")
    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/add/highlights", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("myStories")
        res.render("highlights", { footer: true, loginuser})

    } catch (error) {
        res.status(500).json({ error })
    }
});



router.get("/add/highlights/cover/:Ids", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        
        const idsArray = req.params.Ids.split(",")
        if (idsArray.length > 0) {
            // Assuming you have a Story model to find the stories by their IDs
            const stories = await storyModel.find({ _id: { $in: idsArray } });

            if (stories.length > 0) {
                const cover = stories[0].image; // Assuming each story has an 'image' field

                res.render("next", { footer: true, loginuser, cover, ids: idsArray });
            } else {
                res.status(404).json({ error: "No stories found for the given IDs" });
            }
        } else {
            res.status(400).json({ error: "No IDs provided" });
        }
    } catch (error) {
        res.status(500).json({ error });
    }
});


   

router.post("/upload/highlight/:cover", auth, async (req, res) => {
    try {
        // Ensure the user is authenticated
        const loginuser = await userModel.findOne({ email: req.user.email });
        
        // Extract ids and title from request body
        let { ids, title } = req.body;
        title = title || "Untitled";
        
        // Ensure ids is an array
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "Invalid 'ids' format. It should be an array." });
        }

        // Trim any extra spaces from the IDs
        ids = ids.map(id => id.trim());

        // Fetch all stories for the ids
        const storiesPromises = ids.map(async (id) => {
            try {
                const story = await storyModel.findById(id);
                if (!story) {
                    console.error(`Story not found for id: ${id}`);
                    return null;
                }
                return story;
            } catch (err) {
                console.error(`Error fetching story with id ${id}:`, err);
                return null;
            }
        });

        // Await all story fetch promises
        const stories = await Promise.all(storiesPromises);

        // Filter out any null values in case any stories were not found
        const filteredStories = stories.filter(story => story !== null);

        // Create new highlight with fetched stories
        const newhighlight = await HighlightModel.create({
            title,
            user: loginuser._id,
            coverphoto: req.params.cover,
            stories: filteredStories,
        });

        loginuser.highlights.push(newhighlight._id)
        newhighlight.populate("stories")
        await newhighlight.save();
        await loginuser.save();
        // console.log(newhighlight.stories)
        req.flash("success", "Highlight created Successfully.")   

       const message =  req.flash("success")
       res.json({ message});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get("/highlights/:highlightId/:number", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        // Fetch the highlight and populate the stories array
        const highlight = await HighlightModel.findById(req.params.highlightId).populate("stories");

    
        // Ensure highlight exists and the stories array has the element at the specified index
        if (highlight && highlight.stories.length > req.params.number) {
            let highlightimage = highlight.stories[req.params.number].image;

            res.render("viewhighlights", {
                footer: false,
                highlightimage,
                loginuser,
                number: req.params.number,
            });
        } else {
            // Redirect to profile if no further stories are available
            res.redirect("/profile");
        }
    } catch (error) {
        // Handle errors by returning a 500 status code and the error message
        res.status(500).json({ error: error.message });
    }
});



router.get("/settings", auth, async (req, res)=>{
    try { 
        const loginuser = await userModel.findOne({email : req.user.email});
        res.render("settings", {loginuser, footer : true})
        
    } catch (error) {
         res.status(500).json({error})
    }
})













module.exports = router
