const userModel = require("../models/user.model")
const storyModel = require("../models/story.model")


exports.addStory = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("myStories")

        if (!req.file.path) {
            return res.status(403).json({ success: false, message: "Please upload path for uploading a Story" })
        }

        const newStory = await storyModel.create({
            user: loginuser._id,
            // image: req.file.filename,
            image: req.file.path
        })
        loginuser.stories.push(newStory._id);
        loginuser.myStories.push(newStory);
        await loginuser.save();
        res.status(302).redirect(`/feed`);
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")

    }
}


exports.usersStoryPage = async (req, res) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }

}


exports.loginuserStoryPage = async (req, res) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")

    }

}


exports.likeStory = async (req, res, next) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.deleteStory =  async (req, res, next) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
})