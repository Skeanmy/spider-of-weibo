const mongoose = require('mongoose');
const { MONGO_CONF } = require('../config');
const { url: dataUrl } = MONGO_CONF;

console.log('建立mongoose连接...');
mongoose.connect(dataUrl);

mongoose.connection.on('connected', function() {
  console.log('mongoose default connection open to:' + dataUrl);
});

mongoose.connection.on('error', function(err) {
  console.log('mongoose 连接错误' + err);
});

mongoose.connection.on('disconnected', function() {
  console.log('mongoose 断开连接...');
});

process.on('SIGNIT', function() {
  mongoose.connection.close(function() {
    console.log('mongoose default connection disconnected through the app termination');
    process.exit(0);
  });
});

module.exports = mongoose;
