const mongoose = require('mongoose');
const User = require('./user');
const Channel = require('./channel');

var MessageSchema = new mongoose.Schema({
    messageBody: String, default: "",
    timeStamp: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        //ref: "User"
    },
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        //ref: "Channel"
    },
    userName: String, default: "",
    userAvatar: String, default: "",
    userAvatarColor: String, default: "" 
});

var Message = mongoose.model("Message", MessageSchema);
module.exports = {Message};