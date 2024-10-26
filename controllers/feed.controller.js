const userModel = require("../models/user.model")
const postModel = require("../models/post.model")
const storyModel = require("../models/story.model")



exports.feedPage = async(req, res, next) => {
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
        // res.status(500).json({ message: error.message });
        res.status(500).render("server")
    }
}


exports.searchUsersPage = async(req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('search', { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.searchUsers = async(req, res, next) => {
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
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}


exports.openUserProfilePage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        const openuser = await userModel.findOne({ username: req.params.username }).populate(`posts`);

        res.render(`openprofile`, { footer: true, loginuser, openuser });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}