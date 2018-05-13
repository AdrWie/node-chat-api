
require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const http = require('http');
const socket = require('socket.io');

const {User} = require('./model/user');
const {Account} = require('./model/account');
const {Channel} = require('./model/channel');
const {Message} = require('./model/message');
var {ObjectId} = require('mongodb');
var {mongoose} = require('./db/db');
var {authenticate} = require('./middleware/authentication');
var UserDataExtension = require('./extensions/userData');

var app = express();
app.server = http.createServer(app);
var io = socket(app.server);

const port = process.env.PORT;

// Middleware parse application/json
app.use(bodyParser.json());

// For testing if API is up and running
app.get('/', (req, res) => {
    res.json({message: 'Chat API is up and running'});
});

// Grab email and password from request, encrypt password before save, return authtoken to response.   
 app.post("/account/register", (req, res) => {
     var body = _.pick(req.body, ["email", "password"]);
     var account = new Account(body);
     UserDataExtension.findUserByEmail(body.email, (err, userData) => {
         if(err) {
             res.status(409).send({message: `An error occured: ${err.message}`});
         } else if(userData) {
             res.status(300).send({message: `Email: ${body.email} is already registered`});
         }
         account.save().then(() => {
            res.status(200).send("Successfully created new account");
         });
    });  
}); 

// Login user. Check if user exists in databas, if so, authenticate user and return token.
app.post("/account/login", (req, res) => {
    var body = _.pick(req.body, ["email", "password"]);
    Account.findByCredentials(body.email, body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
            //res.header('x-auth', token).send(user);
            res.status(200).send({
                user: req.body.email,
                token: token
            });
        });    
    }).catch((err) => {
        res.status(400).send({message: `Email or password incorrect. '${body.email}' `});
    });
});

// Create new chat user
app.post('/user/add', authenticate, (req, res) => {
    var body = _.pick(req.body, ['name', 'email', 'avatarName', 'avatarColor']);
    var user = new User(body);

    user.save().then((user) => {
        res.status(200).send(user);
    }, (err) => {
        res.status(500).send(err);
    });
});

app.get('/users', authenticate, (req, res) => {
    User.find({}, (err, users) => {
        if(err) {
            res.status(500).json({message: err});
        }
        res.status(200).json(users);
    });
});

// Get user by user email, authenticate token and responed with user object.  
app.get('/user/byEmail/:email', authenticate, (req, res) => {
    
    User.findOne({"email": req.params.email}).then((user) => {
        if(!user) {
            return res.status(400).send({message: "Could not find chat user"});
        }
        res.status(200).send(user);
    });   
});

app.post('/channel/add', authenticate, (req, res) => {
    var body = _.pick(req.body, ["name", "description"]);
    var channel = new Channel(body);

    channel.save().then((channel) => {
        res.status(200).send(channel);
    }, (err) => {
        res.status(400).send(err);
    });
});

// Authenticate, then get all channels. 
app.get('/channel', authenticate, (req, res) => {
    Channel.find({}, (err, channels) => {
        if(err) {
            res.status(400).send({message: err});
        }
        res.status(200).send(channels);
    });
});

// Authenticate, Add new message, then save to database.
app.post('/message/add', authenticate, (req, res) => {
    var body = _.pick(req.body, ["messageBody", "userId", "channelId", "userName", "userAvatar", "userAvatarColor"]);
    var newMessage = new Message(body);

    newMessage.save(err => {
        if(err) {
            res.status(500).json({message: err});
        }
        res.status(200).json({message: 'Message successfully saved.'});
    });
});

// Authenticate, get messages by channel id.
app.get('/message/byChannel/:channelId', authenticate, (req, res) => {
    Message.find({ 'channelId' : req.params.channelId }, (err, messages) => {
        if(err) {
          res.status(500).json({ message: err });
        }
        res.status(200).json(messages);
      });
});

// -- Websocket -- 
var typingUsers = {};

io.on('connection', function(client) {
    console.log("User connected...");
    // Listen for new channel create message from client (Android app)
    client.on("newChannel", function(name, description) {
        var newChannel = new Channel({
            name: name,
            description: description 
        });
        newChannel.save(function(err, channel) {
            if(err) {
                console.log("Could not emit messages to other in the room" + err);
            }
            console.log("New channel added.");
            io.emit("channelCreated", channel.name, channel.description, channel.id);
        });
    });
    //Listen for user typing a message.
    client.on("startType", function(userName, channelId) {
        console.log(userName + " is writing a message...");
        typingUsers[userName] = channelId;
        io.emit("userTypingUpdate", typingUsers, channelId);
    });

    client.on("stopType", function(userName) {
        console.log(userName + " has stopped writing a message.")
        delete typingUsers[userName];
        io.emit("userTypingUpdate", typingUsers);
    });

    // Listen for new chat message
    client.on("newMessage", function(messageBody, userId, channelId, userName, userAvatar, userAvatarColor) {
        console.log(messageBody);

        var newMessage = new Message({
            messageBody: messageBody,
            userId: userId,
            channelId: channelId,
            userName: userName,
            userAvatar: userAvatar,
            userAvatarColor: userAvatarColor
        });
        newMessage.save(function(err, message) {
            if(err) {
                console.log("Could not send message to the room." + err);
            }
        //sending message to clients in the room.
        console.log("New message sent!");
        io.emit("messageCreated", message.messageBody, message.userId, message.channelId,
                                  message.userName, message.userAvatar, message.userAvatarColor); 
        });    
    });
});



app.listen(port, () => {
    console.log(`Started on port: ${port}`);
});

module.exports = {app};

