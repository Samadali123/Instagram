const express = require('express');
const router = express.Router();
const {authentication} = require("../middlewares/auth");
const { createNote, createNotePage, deleteNote } = require('../controllers/notes.controller');


// create note page
router.get("/createnote", authentication, createNotePage )

// create new note
router.post("/createnote", authentication, createNote)

// delete note
router.get("/deletenote", authentication, deleteNote )



module.exports = router;