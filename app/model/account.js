const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var AccountSchema = new mongoose.Schema({

    email: {
        type: String,
        default: "",
        trim: true,
        minlength: 2,
        unique: true,
        validate: (value) => {
            return validator.isEmail(value);
        },
        message: "{VALUE} is not a valid email."
    },
    password: {
        type: String,
        default: "",
        minlength: 2
    },
    tokens: [{
        access: {
          type: String,
          required: true
        },
        token: {
          type: String,
          required: true
        },
      }]
});

// Instance method
AccountSchema.methods.toJSON = function () {
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject, ['_id', 'email']);
};
// Instance method, construct an auth token, set it to the user token variable and return the token
AccountSchema.methods.generateAuthToken = function () {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET).toString();

    user.tokens = user.tokens.concat([{ access, token }]);

    return user.save().then(() => {
        return token;
    });
};

// Model method - Used to authenticate users token, decode user properties then compare properties
// with provided token
AccountSchema.statics.findByToken = function (token) {
    var User = this;
    var decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return Promise.reject('Authentication failed!');
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};
// Find user email, if no user exist with given credentials reject, else compare given password with
// stored encrypted password, if true resolve and return user.
AccountSchema.statics.findByCredentials = function (email, password) {
    var user = this;

    return Account.findOne({ email }).then((user) => {
        if (!user) {
            return Promise.reject();
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    reject();
                }
            });
        });
    });
};
// Middleware - executed before saving user to database, if password is modified, ecrypt it and continue
// execute next function. If not modified just move on. 
AccountSchema.pre('save', function (next) {
    var user = this;

    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

var Account = mongoose.model("Account", AccountSchema);

module.exports = {Account};

