// require("dotenv").config({ path: "./.env" });
require("dotenv").config();
var express = require('express');
var router = express.Router();
const localStrategy = require(`passport-local`)
const passport = require(`passport`)
// const upload = require("./multer");
const uploadMiddleware = require("./multer");
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
const upload = require("./multer");


// Login with Google Api
router.get('/login/federated/google', passport.authenticate('google'));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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




// router.get('/feed', auth, async function (req, res) {
//     try {
//         // Find the logged-in user's details
//         const loginuser = await userModel.findOne({ email: req.user.email });

//         // Find all posts by:
//         // 1. The logged-in user
//         // 2. Users the logged-in user follows
//         // 3. Users with public accounts
//         const allposts = await postModel.find({
//             $or: [
//                 { 'user': loginuser._id }, // Posts by the logged-in user
//                 { 'user': { $in: loginuser.following } }, // Posts by users the login user follows
//                 { 'user.privateAccount': false },

//                 // Posts by users with a public account
//             ]
//         }).populate('user').populate('comments');

//         // Fetch all stories excluding those related to the login user
//         const allstory = await storyModel.find({ user: { $ne: loginuser._id } }).populate('user');

//         // Filter unique user stories
//         const obj = {};
//         const userStories = allstory.filter(story => {
//             if (!obj[story.user._id]) {
//                 obj[story.user._id] = true;
//                 return true;
//             }
//             return false;
//         });

//         // Render the feed page
//         res.render('feed', { footer: true, loginuser, allposts, userStories, dater: utils.formatRelativeTime });
//     } catch (error) {
//         // Handle any errors that occur during the request
//         res.status(500).json({ message: error.message });
//     }
// });


router.get('/feed', auth, async function (req, res) {
    try {
        // Find the logged-in user's details
        const loginuser = await userModel.findOne({ email: req.user.email });
        // Exclude posts by blocked users
        const allposts = await postModel.find({
            $and: [
                {
                    $or: [
                        { 'user': loginuser._id }, // Posts by the logged-in user
                        { 'user': { $in: loginuser.following } }, // Posts by users the login user follows
                        { 'user.privateAccount': false } // Posts by users with a public account
                    ]
                },
                {
                    'user': { $nin: loginuser.blockedUsers } // Exclude posts from blocked users
                }
            ]
        }).populate('user').populate('comments');


        // const allstory = await storyModel.find(
        //     { 
        //      user:
        //      { $ne: loginuser._id }
        //      }).populate('user');

        const allstory = await storyModel.find({
            $and: [
              { user: { $ne: loginuser._id } },
              {
                $or: [
                  { 'user.privateAccount': false },
                  { user: { $in: loginuser.following } }
                ]
              },
              { user: { $nin: loginuser.blockedUsers } }
            ]
          }).populate('user');

        // Filter unique user stories
        const obj = {};
        const userStories = allstory.filter(story => {
            if (!obj[story.user._id]) {
                obj[story.user._id] = true;
                return true;
            }
            return false;
        });

        // Render the feed page
        res.render('feed', { footer: true, loginuser, allposts, userStories, dater: utils.formatRelativeTime });
    } catch (error) {
        // Handle any errors that occur during the request
        res.status(500).json({ message: error.message });
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




router.get('/users/:input', auth, async (req, res) => {
    try {

        // Find the logged-in user's details
        const loginuser = await userModel.findOne({ email: req.user.email });
        if (!loginuser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Debugging: Check if loginuser.blockedUsers is correctly retrieved
        console.log('Blocked users:', loginuser.blockedUsers);
        // Get the input parameter and create a regex for case-insensitive search
        const input = req.params.input;
        const regex = new RegExp(`^${input}`, 'i');

        // Debugging: Check the regex pattern
        console.log('Regex pattern:', regex);
        // Find users matching the regex and exclude those in the blockedUsers array
        const users = await userModel.find({
            username: regex,
            _id: { $nin: loginuser.blockedUsers } // Exclude users that are in the blockedUsers array
        });

        // Debugging: Check the users returned by the query
        console.log('Found users:', users);
        // Return the list of users as JSON
        res.json(users);
    } catch (error) {
        // Handle any errors and respond with a 500 status
        console.error('Error:', error); // Log error details for debugging
        res.status(500).json({ error: error.message });
    }
});


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
        loginuser.myStories.push(newStory);
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


// router.get("/posts/open/:openpost/:openuser", auth, async (req, res, next) => {
//     try {
//         const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")

//         const openUser = await userModel.findById(req.params.openuser).populate("followers").populate("following")

//         const openPost = await postModel.findById(req.params.openpost).populate("user");
//         if (!openPost) return res.status(403).json({ message: "Post not found!" });

//         const count = await postModel.countDocuments();
//         const randomIndex = Math.floor(Math.random() * count);
//         const randomPosts = await postModel.find().skip(randomIndex).limit(19).populate("user");
//         let posts = [openPost, ...randomPosts];
//         res.render("openpost", { footer: true, posts, loginuser, openUser, dater: utils.formatRelativeTime })
//     } catch (error) {
//         res.status(500).json({ error })
//     }
// });



router.get("/posts/open/:openpost/:openuser", auth, async (req, res, next) => {
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
        res.status(500).json({ error });
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
        const loginuser = await userModel.findOne({ email: req.user.email })
        if (!post) return res.status(403).json({ message: "Post not found !" });
        loginuser.deletedContent.push(post);
        await loginuser.save();
        res.redirect("/profile");
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
        res.render("highlights", { footer: true, loginuser })

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

        const message = req.flash("success")
        res.json({ message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get("/highlights/:highlightId/:number", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        // Fetch the highlight and populate the stories array
        const highlight = await HighlightModel.findById(req.params.highlightId);

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





router.get("/settings", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("settings", { loginuser, footer: true })

    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/saved/posts", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("savedPosts")
        res.render("saved", { footer: true, loginuser })
    } catch (error) {
        res.status(500).json({ error })
    }
})



router.get("/saved/posts/open/:openpost/:openuser", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")

        const openUser = await userModel.findById(req.params.openuser).populate("followers").populate("following")

        const openPost = await postModel.findById(req.params.openpost).populate("user");
        if (!openPost) return res.status(403).json({ message: "Post not found!" });

        const count = await postModel.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);
        const randomPosts = await postModel.find().skip(randomIndex).limit(19).populate("user");
        let posts = [openPost, ...randomPosts];
        res.render("opensavedpost", { footer: true, posts, loginuser, openUser, dater: utils.formatRelativeTime })
    } catch (error) {
        res.status(500).json({ error })
    }
});

router.get("/archieve/stories", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("archieve", { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error });
    }
});


router.get(`/archieve/story/:id`, auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const story = await storyModel.findById(req.params.id).populate("user");
        if (story) {
            res.render("archievestory", { footer: false, loginuser: false, story, dater: utils.formatRelativeTime });
        } else {
            if (!story) return res.redirect("/archieve/stories")
        }
    } catch (error) {
        res.status(500).json({ error })
    }

})

router.get("/activity", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render("activity", { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ error });
    }
})


router.get("/user/likes", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const userPosts = await postModel.find({ likes: loginuser._id }).populate("user");
        res.render("userlikes", { footer: true, loginuser, userPosts });

    } catch (error) {
        res.status(500).json({ error });
    }
});


router.get("/user/comments", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (!loginuser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find all comments made by the logged-in user and populate the post field
        const userComments = await commentModel.find({ user: loginuser._id })
            .populate({
                path: 'post',
                populate: {
                    path: 'user', // populate the user field in the post
                    select: '_id username profile' // selecting only necessary fields
                }
            }).populate('user'); // populate the user who made the comment

        // Helper function to calculate relative time
        function getRelativeTime(date) {
            const now = new Date();
            const diff = now - new Date(date);
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (years > 0) return `${years}yr${years > 1 ? 's' : ''}`;
            if (months > 0) return `${months}mon${months > 1 ? 's' : ''}`;
            if (days > 0) return `${days}d${days > 1 ? 'ays' : 'ay'} `;
            if (hours > 0) return `${hours}hr${hours > 1 ? 's' : ''} `;
            if (minutes > 0) return `${minutes}min${minutes > 1 ? 's' : ''} `;
            return `${seconds}s${seconds > 1 ? 's' : ''}`;
        }

        // Format the createdAt dates for comments and posts
        userComments.forEach(comment => {
            comment.formattedCreatedAt = getRelativeTime(comment.createdAt);
            if (comment.post) {
                comment.post.formattedCreatedAt = getRelativeTime(comment.post.createdAt);
            }
        });
        // Render the data to a template (e.g., usercomments.ejs)
        res.render("usercomments", { footer: true, userComments, loginuser });

    } catch (error) {
        // Handle any errors that occur
        res.status(500).json({ error: error.message });
    }
});



router.get('/user/posts/comments/:postId', auth, async (req, res, next) => {
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
        res.render('postcomments', { header: true, footer: false, loginuser, comments, post });
    } catch (error) {
        res.status(500).json({ error })
    }
});


router.get("/liked/posts/:postid/:userid", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")

        const openUser = await userModel.findById(req.params.userid).populate("followers").populate("following")

        const openPost = await postModel.findById(req.params.postid).populate("user");
        if (!openPost) return res.status(403).json({ message: "Post not found!" });

        const count = await postModel.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);
        const randomPosts = await postModel.find().skip(randomIndex).limit(19).populate("user");
        let posts = [openPost, ...randomPosts];
        res.render("openuserliked", { footer: true, posts, loginuser, openUser, dater: utils.formatRelativeTime })
    } catch (error) {
        res.status(500).json({ error })
    }
})



router.get("/user/deleted/content", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("deleted", { footer: true, loginuser })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


router.get("/user/posts", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("posts")
        res.render("posts", { footer: true, loginuser })

    } catch (error) {
        res.status(500).json({ error })
    }
})


router.get("/user/posts/open/:postid", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        // const openPost = await postModel.findById(req.params.openpost).populate("user").populate("comments");
        const openPost = await postModel.findById(req.params.postid).populate("user")

        if (!openPost) return res.status(403).json({ message: "Post not found!" });

        res.render("singlepost", {
            footer: true,
            openPost,
            loginuser,
            dater: utils.formatRelativeTime
        });
    } catch (error) {
        res.status(err.status).json({ message: err.message })
    }
})


router.get("/user/highlights", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("userhighlights", { footer: true, loginuser })
    } catch (error) {
        res.status(error.status).json({ message: error.message })
    }
})


router.get("/user/highlights/:highlightId/:number", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        // Fetch the highlight and populate the stories array
        const highlight = await HighlightModel.findById(req.params.highlightId);

        // Ensure highlight exists and the stories array has the element at the specified index
        if (highlight && highlight.stories.length > req.params.number) {
            let highlightimage = highlight.stories[req.params.number].image;

            res.render("openhighlight", {
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



router.get("/accountstatus", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("accountstatus", { footer: true, loginuser })
    } catch (error) {
        res.status(error.status).json({ message: error.message })
    }
})


router.get("/removecontent", auth, async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("removecontent", { footer: true, loginuser })
    } catch (error) {
        res.status(error.status).json({ message: error.message })
    }
})





router.get('/content/removed', auth, async (req, res) => {
    try {

        async function deleteUserContent(userId) {
            try {
                // Fetch the user by ID and populate references
                const user = await userModel.findById(userId).populate('posts highlights stories');
                if (!user) {
                    throw new Error('User not found');
                }

                // Check if user has content
                if (user.posts.length === 0 && user.highlights.length === 0 && user.stories.length === 0) {
                    return 'No content to delete'; // Return a specific message if no content is found
                }

                // Delete all posts
                await postModel.deleteMany({ _id: { $in: user.posts } });

                // Delete all highlights
                await HighlightModel.deleteMany({ _id: { $in: user.highlights } });

                // Delete all stories
                await storyModel.deleteMany({ _id: { $in: user.stories } });

                // Clear references in the user document
                user.posts = [];
                user.highlights = [];
                user.stories = [];
                await user.save();

                return 'Content removed successfully'; // Return a success message
            } catch (error) {
                throw new Error(`Error deleting user content: ${error.message}`);
            }
        }



        // Find the logged-in user
        const loginUser = await userModel.findOne({ email: req.user.email });

        if (!loginUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Call the function to delete content
        const result = await deleteUserContent(loginUser._id);

        if (result === 'No content to delete') {
            // Send a message if no content was found
            return res.status(200).json({ message: 'User does not have any content posted yet' });
        }

        // Redirect to account status page if content was successfully removed
        res.redirect('/accountstatus');
    } catch (error) {
        // Handle errors
        res.status(500).json({ message: error.message });
    }
});


router.get("/guidelines", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("guidelines", { footer: true, loginuser: loginuser })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})



router.get("/contentlowered", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("contentlowered", { footer: true, loginuser: loginuser })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})



router.get("/featuresnotuse", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("features", { footer: true, loginuser: loginuser })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})



router.get("/aboutus", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (loginuser && loginuser.Date) {  // Replace 'dateField' with the actual field name in your model
            const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
            loginuser.formattedDate = dateFormatter.format(new Date(loginuser.Date));
        }

        res.render("aboutus", { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});




router.get("/account/privacy", auth, async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (loginuser && loginuser.Date) {  // Replace 'dateField' with the actual field name in your model
            const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
            loginuser.formattedDate = dateFormatter.format(new Date(loginuser.Date));
        }

        res.render("accountprivacy", { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



router.get("/account/toggle", auth, async (req, res) => {
    try {
        // Find the user by email and toggle the privateAccount field
        const loginuser = await userModel.findOne({ email: req.user.email })
        if (!loginuser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        loginuser.privateAccount = !loginuser.privateAccount;
        await loginuser.save()

        res.status(200).json({ success: true, loginuser });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



router.put("/restpassword", auth, async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const loginuser = await userModel.findOne({ email: req.user.email }); // Assuming user ID is attached to req.user

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    try {
        // Find user by ID
        const user = await userModel.findById(loginuser._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect, forgot your password' });
        }

        // Hash new password and update user record
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        // Log the error details
        console.error('Error in changePassword controller:', error.message);
    };
})




router.put("/block/user", auth, async (req, res, next) => {
    try {
        // Check if req.user is available from the auth middleware
        if (!req.user || !req.user.email) {
            return res.status(403).json({ success: false, message: "Authorization failed. User not authenticated." });
        }

        // Fetch the logged-in user from the database
        const loginUser = await userModel.findOne({ email: req.user.email });
        if (!loginUser) {
            return res.status(403).json({ success: false, message: "Logged-in user not found!" });
        }

        // Fetch the user to be blocked from the database
        const userToBlock = await userModel.findById(req.body.userId);
        if (!userToBlock) {
            return res.status(403).json({ success: false, message: "User to block not found. Please provide a valid user ID." });
        }

        // Prevent the user from blocking themselves
        if (loginUser._id.equals(userToBlock._id)) {
            return res.status(403).json({ success: false, message: "You cannot block yourself." });
        }

        // Check if the user is already blocked
        if (loginUser.blockedUsers.includes(userToBlock._id)) {
            return res.status(200).json({
                success: false,
                message: "You have already blocked this account.",
            });
        }

        // Add the user to blocked users list and save both users
        loginUser.blockedUsers.push(userToBlock._id);
        userToBlock.blockedBy.push(loginUser._id);

        await loginUser.save();
        await userToBlock.save();

        return res.status(200).json({
            success: true,
            message: "User successfully blocked.",
            loginUser,
            userToBlock
        });

    } catch (error) {
        console.error("Error blocking user:", error); // Log the actual error
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message
        });
    }
});



router.get("/blocked/accounts", auth, async (req, res, nect) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("blockedUsers")
        res.render("blockedAccounts", { footer: true, loginuser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})


// API to unblock a user
router.put('/unblock/user', auth, async (req, res) => {
    try {
        // Find the logged-in user by their email
        const loginuser = await userModel.findOne({ email: req.user.email });
        if (!loginuser) {
            return res.status(403).json({ success: false, message: "Login user not found! Please login to continue." });
        }

        const userToUnblockId = req.body.id;

        // Ensure the user is not trying to unblock themselves
        if (loginuser._id.toString() === userToUnblockId.toString()) {
            return res.status(400).json({ message: "You cannot unblock yourself." });
        }

        // Find the user to unblock by their ID
        const userToUnblock = await userModel.findById(userToUnblockId);
        if (!userToUnblock) {
            return res.status(404).json({ message: 'User to unblock not found.' });
        }

        // Check if the user is actually blocked
        if (!loginuser.blockedUsers.includes(userToUnblockId)) {
            return res.status(400).json({ message: "This account is not in your blocked list." });
        }

        // Remove userToUnblockId from loginuser's blockedUsers array
        loginuser.blockedUsers = loginuser.blockedUsers.filter(id => id.toString() !== userToUnblockId.toString());

        // Remove loginuser._id from userToUnblock's blockedBy array
        userToUnblock.blockedBy = userToUnblock.blockedBy.filter(id => id.toString() !== loginuser._id.toString());

        // Save both updated user documents
        await loginuser.save();
        await userToUnblock.save();

        res.status(200).json({ success: true, message: 'User successfully unblocked.' });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error.', error });
    }
});



module.exports = router

