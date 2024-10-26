const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { addHighlightPage, addHighlightsNextPage, addHighlightCoverphoto, viewHighlightsPage } = require('../controllers/highlights.controller');


// add highlights page
router.get("/add/highlights", authentication,  addHighlightPage)


// add highlights next page
router.get("/add/highlights/cover/:Ids", authentication,  addHighlightsNextPage);


// add cover photo of highlights
router.post("/upload/highlight/:cover", authentication,  addHighlightCoverphoto);


// get highlights from number
router.get("/highlights/:highlightId/:number", authentication,  viewHighlightsPage);



module.exports = router;
