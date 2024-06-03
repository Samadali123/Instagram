const mongoose = require('mongoose');


mongoose.connect("mongodb://127.0.0.1:27017/Instagram")
const plm = require(`passport-local-mongoose`);

const userSchema = mongoose.Schema({

    username: {
        type: String,
        require: [true, "username is required "],
        minLength: [3, "username must be at least 3 characters"],
    },

    fullname: {
        type: String,
        require: [true, "fullname is required "],
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
        minLength: [3, "password must be at least 3 characters"],
        maxLength: [15, "password must be at most 15 characters"],
        match: [
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{3,15}$/,
            "Invalid password format."

        ]
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
    }]


})



userSchema.plugin(plm);


module.exports = mongoose.model(`user`, userSchema);