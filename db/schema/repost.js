const mongoose = require('../db');

const repostSchema = new mongoose.Schema({
  content: String, // 转发内容
  uname: String, // 转发的博主名称
  uid: String,
  time: String, // 转发时间
  mid: String, // 哪条微博的转发
  postTime: Date, // 格式化的时间
});

module.exports = mongoose.model('Repost', repostSchema);