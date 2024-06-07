// const mongoose = require('mongoose');

// const storySchema = new mongoose.Schema({
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'user',
//         required: [true, "User is required for creating a story"]
//     },
//     image: {
//         type: String,
//         required: [true, "Image is required for creating a story"]
//     },
//     viewers: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'user'
//     }],
//     likes: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'user'
//     }],
//     expiryDate: {
//         type: Date,
//         default: () => new Date(+new Date() + 24 * 60 * 60 * 1000)
//     },
// }, { timestamps: true, versionKey: false });

// storySchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

// const Story = mongoose.model('Story', storySchema);

// module.exports = Story;






const mongoose = require('mongoose');
const User = require('./users'); // Ensure the correct path to the User model

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
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
}, { timestamps: true, versionKey: false });

// Index to automatically delete stories after they expire
storySchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

// Middleware to handle user stories array when a story is deleted
storySchema.pre('remove', async function(next) {
    try {
        const story = this;
        await User.updateOne({ _id: story.user }, { $pull: { stories: story._id } });
        next();
    } catch (error) {
        next(error);
    }
});

// Ensure expired stories are also cleaned up
storySchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        try {
            await User.updateOne({ _id: doc.user }, { $pull: { stories: doc._id } });
        } catch (error) {
            console.error('Error updating user stories array:', error);
        }
    }
});

const Story = mongoose.model('Story', storySchema);

module.exports = Story;