const express = require('express');
const { authentication } = require('../middlewares/auth');
const router = express.Router();
const upload = require("../utils/multer");
const { profilePage, uploadProfile, editProfileDetails, editProfilePage } = require('../controllers/profile.controller');


// profile page
router.get("/profile", authentication, profilePage )

// upload profile
router.post("/uploadprofile", authentication, upload.single("profile"), uploadProfile )

// edit profile page
router.get("/edit", authentication,  editProfilePage)

// edit profile details
router.post("/edit/profile", authentication,  editProfileDetails)






module.exports = router;