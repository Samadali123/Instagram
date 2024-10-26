const userModel = require("../models/user.model")
const postModel = require("../models/post.model")
const HighlightModel = require("../models/highlights.model")
const storyModel = require("../models/story.model")
const commentModel = require("../models/comments.model")

exports.settingsPage = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("settings", { loginuser, footer: true })

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.savedPostsPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("savedPosts")
        res.render("saved", { footer: true, loginuser })
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.openSavedPostsPage = async (req, res, next) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.archievePage  = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("archieve", { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}



exports.archieveStoryPage = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const story = await storyModel.findById(req.params.id).populate("user");
        if (story) {
            res.render("archievestory", { footer: false, loginuser: false, story, dater: utils.formatRelativeTime });
        } else {
            if (!story) return res.redirect("/archieve/stories")
        }
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }

}


exports.activityPage = async (req, res, next) => {

    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render("activity", { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}


exports.userLikesPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const userPosts = await postModel.find({ likes: loginuser._id }).populate("user");
        res.render("userlikes", { footer: true, loginuser, userPosts });

    } catch (error) {
        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}


exports.userCommentsPage = async (req, res, next) => {
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
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}



exports.postCommentsPage = async (req, res) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}




exports.openUserLikedPage =  async (req, res, next) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}



exports.deletedContentPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("deleted", { footer: true, loginuser })
    } catch (error) {
        // res.status(500).json({ error: error.message })
        res.status(500).render("server")
    }
}


exports.postsPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("posts")
        res.render("posts", { footer: true, loginuser })

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}



exports.singlePostPage = async (req, res, next) => {
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
        // res.status(err.status).json({ message: err.message })
        res.status(500).render("server")
    }
}



exports.userHighlightsPage =  async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("userhighlights", { footer: true, loginuser })
    } catch (error) {
        // res.status(error.status).json({ message: error.message })
        res.status(500).render("server")
    }
}


exports.openHighlightsPage = async (req, res) => {
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
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}



exports.accountStatusPage =  async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("accountstatus", { footer: true, loginuser })
    } catch (error) {
        // res.status(error.status).json({ message: error.message })
        res.status(500).render("server")
    }
}



exports.removeContentPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("highlights");
        res.render("removecontent", { footer: true, loginuser })
    } catch (error) {
        // res.status(error.status).json({ message: error.message })
        res.status(500).render("server")
    }
}





exports.removeContent = async (req, res) => {
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
                // throw new Error(`Error deleting user content: ${error.message}`);
                res.status(500).render("server")
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
        // res.status(500).json({ message: error.message });
        res.status(500).render("server")
    }
}




exports.guidelinesPage = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("guidelines", { footer: true, loginuser: loginuser })
    } catch (error) {
        // res.status(500).json({ message: error.message });
        res.status(500).render("server")
    }
}



 exports.contentLoweredPage =  async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("contentlowered", { footer: true, loginuser: loginuser })
    } catch (error) {
        // res.status(500).json({ message: error.message });
        res.status(500).render("server")
    }
}


exports.featuresPage =    async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        res.render("features", { footer: true, loginuser: loginuser })
    } catch (error) {
        // res.status(500).json({ message: error.message });
        res.status(500).render("server")
    }
}



exports.aboutUsPage = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (loginuser && loginuser.Date) {  // Replace 'dateField' with the actual field name in your model
            const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
            loginuser.formattedDate = dateFormatter.format(new Date(loginuser.Date));
        }

        res.render("aboutus", { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ success: false, message: error.message });
        res.status(500).render("server")
    }
}




exports.accountPrivacyPage = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (loginuser && loginuser.Date) {  // Replace 'dateField' with the actual field name in your model
            const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
            loginuser.formattedDate = dateFormatter.format(new Date(loginuser.Date));
        }

        res.render("accountprivacy", { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ success: false, message: error.message });
        res.status(500).render("server")
    }
}



exports.accountToggle = async (req, res) => {
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
        // res.status(500).json({ success: false, message: error.message });
        res.status(500).render("server")
    }
}




exports.resetPassWordAccount = async (req, res, next) => {
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
        // console.error('Error in changePassword controller:', error.message);
        res.status(500).render("server")
    };
}




exports.blockUser = async (req, res, next) => {
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
        // console.error("Error blocking user:", error); // Log the actual error
        // return res.status(500).json({
        //     success: false,
        //     message: 'Internal server error.',
        //     error: error.message
        // });
        res.status(500).render("server")
    }
}



exports.blcokedAccountsPage = async (req, res, nect) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("blockedUsers")
        res.render("blockedAccounts", { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ success: false, message: error.message })
        res.status(500).render("server")
    }
}


exports.unblockUser = async (req, res) => {
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
        // res.status(500).json({ message: 'Internal server error.', error });
        res.status(500).render("server")
    }
}