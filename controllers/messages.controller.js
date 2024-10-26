const userModel = require("../models/user.model")

exports.messagesPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        if (!loginuser) {
            return res.status(403).json({ success: false, message: "Login user not found! Please login to continue." });
        }
        res.render("messages", { footer: false, loginuser })
    } catch (error) {
        // res.status(error.status).json({success:false, message : error.message})
        res.status(500).render("server")
    }
}


