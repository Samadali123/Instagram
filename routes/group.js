const mongoose = require('mongoose');

const groupSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    profileImage: {
        type: String,
        default: `https://imgs.search.brave.com/0bM_YGELGhDRpkha170xdj62rM1gANg5mUFtcD3Jcqw/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzJmLzU5/L2VmLzJmNTllZjc0/M2ZkYjliZmNmN2Yw/YTIxYjYzYTAwZjdl/LmpwZw `,
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    createdAt :{
        type : new Date,
        default : Date.now()
    }
});


module.exports = mongoose.model('group', groupSchema);