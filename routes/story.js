const mongoose = require('mongoose');

// Define Schema for Story
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
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    hiddenFrom: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true, versionKey: false, });

// Create a model based on the schema
const Story = mongoose.model('Story', storySchema);

module.exports = Story;