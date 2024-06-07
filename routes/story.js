const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: [true, "User is required for creating a story"]
    },
    image: {
        type: String,
        required: [true, "Image is required for creating a story"]
    },
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    expiryDate: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000)
    },
}, { timestamps: true, versionKey: false });

storySchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;





// const mongoose = require('mongoose');
// const User = require('./users'); // Make sure to require the User model

// const storySchema = new mongoose.Schema({
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: [true, "User is required for creating a story"]
//     },
//     image: {
//         type: String,
//         required: [true, "Image is required for creating a story"]
//     },
//     viewers: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     }],
//     likes: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     }],
//     expiryDate: {
//         type: Date,
//         default: () => new Date(+new Date() + 24 * 60 * 60 * 1000)
//     },
// }, { timestamps: true, versionKey: false });

// storySchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });


// storySchema.pre('remove', async function(next) {
//     try {
//         const story = this;
//         await User.updateOne({ _id: story.user }, { $pull: { stories: story._id } });
//         next();
//     } catch (error) {
//         next(error);
//     }
// });

// const Story = mongoose.model('Story', storySchema);

// module.exports = Story;