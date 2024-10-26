const userModel = require("../models/user.model")


exports.profilePage = async(req,res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate(`posts`).populate("highlights")
        res.render('profile', { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.uploadProfile = async(req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        if (!req.file || !req.file.path) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid profile image to upload.',
            });
        }

        // Store the file path from Cloudinary
        loginuser.profile = req.file.path;

        await loginuser.save();
        res.redirect('/edit');
    } catch (error) {
        console.error('Error uploading profile:', error);
        res.status(500).render('server', { error: 'Internal Server Error' });
    }
}


exports.editProfilePage = async(req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render('edit', { footer: true, loginuser });
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.editProfileDetails = async(req, res, next) => {
    try {
        const { username, fullname, bio } = req.body;
        const User = await userModel.findOne({ email: req.user.email })
        User.username = username;
        User.fullname = fullname;
        User.bio = bio;
        await User.save();
        res.redirect("/profile")
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


