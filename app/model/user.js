const mongoose = require('mongoose');
const validator = require('validator');

var UserSchema = new mongoose.Schema({

  name: {
    type: String,
    default: "",
    trim: true
  },
  email: {
    type: String,
    default: "",
    trim: true,
    validate: (value) => {
      return validator.isEmail(value);
    },
    message: "{VALUE} is not a valid email."
  },
  avatarName: {
    type: String,
    default: ""
  },
  avatarColor: {
    type: String,
    default: ""
  }
});
var User = mongoose.model("User", UserSchema);

module.exports = {User};



