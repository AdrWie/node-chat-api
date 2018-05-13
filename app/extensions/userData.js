const mongoose = require('mongoose');
const {Account} = require('../model/account');

class UserDataExtension {

    // Pass requested email to 'findUserById()' to find user,
    // then find that user email and return callback with error or data.
    static findUserByEmail(email, callback) {
        Account.findOne({'email': email}, (err, data) => {
            if(err) {
                return callback(err, null);
            } else {
                return callback(null, data);
            }
        });
    }
}

module.exports = UserDataExtension;