const mongoose = require('../db');

const userSchema = new mongoose.Schema({
  uid: String, // 用户id
  profile: String, // 用户简介
  uname: String,              
  followCnt:  Number,
  fansCnt: Number,
  weiboCnt: Number,
  fans: Array,
  follows: Array,
  containerid: String,
});

module.exports = mongoose.model('Wbuser', userSchema);