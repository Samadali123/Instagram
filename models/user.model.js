const mongoose = require('mongoose');
const highlights = require('../models/highlights.model');


const userSchema = mongoose.Schema({
    username: {
        type: String,
        require: [true, "username is required "],
        minLength: [3, "username must be at least 3 characters"],
        maxLength: [15, "username should not exceeds 15 charcaters."],
        unique: [true, "This username is not available"],
        trim: true
    },

    fullname: {
        type: String,
        // require: [true, "fullname is required "],

    },

    email: {
        type: String,
        require: [true, "email is required "],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
        unique: true,
    },
    profile: {
        type: String,
        default: `default.jpg`
    },
     
    password: {
        type: String,
        require: [true, "password is required"],
        // minLength: [3, "password must be at least 3 characters"],
        // maxLength: [15, "password should not exceeds 15 characters"],
        // match: [
        //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{3,15}$/,
        //     "Invalid password format."
        // ]
    },
   
    bio: String,
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `post`
    }],

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`
    }],

    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `post`
    }],

    stories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `Story`
    }],

    resetpasswordtoken: {
        type: String,
        default: "0"
    },

    likedstories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `Story`
    }],
    myStories: {
        type : Array,
        default : []
    },
    note: {
        type: String,
        default: "Add a note"
    },
    highlights :[{
        type : mongoose.Schema.Types.ObjectId,
        ref : "highlights"
    }],

    deletedContent :{
        type : Array,
        default : []
    },
    Date : {
        type : Date,
        default : Date.now()
    },
    privateAccount: {
        type: Boolean,
        default: false 
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    blockedBy :[{
        type : mongoose.Schema.Types.ObjectId,
        ref : "user"
    }],
    socketId: {
        type: String,
        default: null
    }


}, {versionKey : false, timeStamps : true});

module.exports = mongoose.model(`user`, userSchema);




