const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    message: String,
    sender: String,
    receiver: String,
    sendAt : {type :   Date, default : Date.now()}
});

module.exports = mongoose.model('message', messageSchema);