
const bcrypt = require('bcrypt');
const userModel = require("../models/user.model");
const sendToken = require("../utils/sendToken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model");



exports.homePage = async(req, res)=>{
    try {
        res.render('login', { footer: false });

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.SignInWithGoogle = async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(403).json({ success: false, message: 'Username and email are required' });
        }

        let user = await userModel.findOne({ email });

        if (!user) {
            const hashedPassword = await bcrypt.hash('dummyPassword', 10);
            user = await userModel.create({ username, email, password: hashedPassword, isAdmin: false });
        } else if (user.username !== username) {
            return res.status(403).json({ success: false, message: 'Username does not match the email' });
        }

        return  sendToken(user,res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.SignInWithGoogle= async (req, res) => {
    try {
        const { username, email} = req.body;

        // Ensure required fields are present
        if (!username || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and email are required.' 
            });
        }
       
        let user = await userModel.findOne({ email });
        if(user){
            return res.status(403).json({ success: false, message: "User already registered"})
        }

        if (!user) {
            // Create a new user with the provided data
            const hashedPassword = await bcrypt.hash('dummyPassword', 10); // Password won't be used
            user = await userModel.create({
                username,
                email,
                password: hashedPassword,
    
            });
        } else if (user.username !== username) {
            // If username mismatch, reject with a 403 error
            return res.status(403).json({ 
                success: false, 
                message: 'Username does not match the registered email.' 
            });
        }

        // Send token to frontend for session management
        sendToken(user, res);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};


exports.SignUp = async (req, res, next) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.SignInPage = async (req, res, next) => {
     try {
        res.render('login', { footer: false });

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.SignIn = async (req, res) => {
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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.SignOut =   async(req, res) =>{
    try {
        res.clearCookie("token");
        res.redirect("/login")
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.forgotPasswordPage = async(req, res)=>{
    try {
        res.render("forgotpassword")
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.sentMail = async(req, res)=>{
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
                subject: `Forget your Instagram Password? Reset now using the link below`,
                html: `
                  <a 
                    href="${`${req.protocol}://${req.get('host')}/reset-password`}" 
                    style="color: royalblue; font-size: 18px; font-weight: 600; text-decoration: none;">
                    Reset Password
                  </a>
                `
            };


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
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.sendMailPage = async(req, res)=>{
    try {
        res.render("sentmail")

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.resetPasswordPage = async(req, res)=>{
    try {
        res.render("resetpassword")
    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}


exports.resetPassword  = async(req, res)=>{
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
        // res.status(500).json({ error }) // Send a more informative message
        res.status(500).render("server")
    }
}



