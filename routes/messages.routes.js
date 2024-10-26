const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { messagesPage } = require('../controllers/messages.controller');

router.get("/messages", authentication, messagesPage )


module.exports = router;