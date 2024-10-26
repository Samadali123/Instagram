const userModel = require("../models/user.model")


exports.createNotePage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })
        res.render("createnote", { loginuser, footer: true })

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.createNote  = async (req, res, next) => {
    try {
        await userModel.findOneAndUpdate({ email: req.user.email }, { $set: { note: req.body.note } }, { new: true })
        res.redirect("/profile");

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.deleteNote = async (req, res, next) => {
    try {
        await userModel.findOneAndUpdate({ email: req.user.email }, { $set: { note: "" } }, { new: true })
        res.redirect("/profile")
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}