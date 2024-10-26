const userModel = require("../models/user.model")

exports.followAndUnfollow = async(req, res)=>{
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.followersPage = async(req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followers`, { openprofileuser, loginuser, footer: true });

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.followingsPage = async(req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        const openprofileuser = await userModel.findOne({ _id: req.params.userId }).populate(`followers`).populate(`following`)
        res.render(`followings`, { openprofileuser, loginuser, footer: true });

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.loginuserFollowersPage  = async(req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following")
        res.render(`myfollowers`, { loginuser, footer: true });

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.loginuserFollowingsPage = async(req, res)=>{
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers").populate("following");

        res.render(`myfollowing`, { loginuser, footer: true });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
} 



exports.removeLoginuserFollower = async(req, res)=>{
    try {
        const followertodelete = await userModel.findById(req.params.id).populate("following")


        const loginuser = await userModel.findOne({ email: req.user.email }).populate("followers")
        loginuser.followers.splice(loginuser.followers.indexOf(followertodelete._id), 1);

        followertodelete.following.splice(followertodelete.following.indexOf(loginuser._id), 1);

        await loginuser.save();
        await followertodelete.save();

        res.json(loginuser.followers);
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")

    }
}



exports.searchUserFollowers = async(req, res)=>{
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.searchUserFollowings = async(req, res) => {
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

        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}






