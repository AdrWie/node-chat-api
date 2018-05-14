// NODE_ENV not implemented
var env = process.env.NODE_ENV || 'development';

// Grab settings for local development
if(env === 'development') {
  var config = require('./config.json');
  var envConfig = config[env];

  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
};