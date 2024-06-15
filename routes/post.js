const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');

const postSchema = mongoose.Schema({
    caption: {
        type: String,
        required: true,
    },

    image: {
        type: String,
        required: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`,
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`,
    }],


    createdAt: {
        type: Date,
        default: Date.now(),
    },

    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`,
    }],

    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `comment`
    }],

    commentsEnabled: {
        type: Boolean,
        default: true
    },

    hidelikes: {
        type: Boolean,
        default: false,
    },


})




module.exports = mongoose.model(`post`, postSchema);