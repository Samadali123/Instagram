const mongoose = require('mongoose');


const commentSchema = mongoose.Schema({
    text: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `user`,
    }],

    createdAt: {
        type: Date,
        default: Date.now(),
    },

});




module.exports = mongoose.model('comment', commentSchema);