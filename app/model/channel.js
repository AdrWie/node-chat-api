const mongoose = require('mongoose');

var ChannelSchema = new mongoose.Schema({
    name: String, default: "",
    description: String, default: ""
});

var Channel = mongoose.model('Channel', ChannelSchema);
module.exports = {Channel};