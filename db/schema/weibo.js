const mongoose = require('../db');

const weiboSchema = new mongoose.Schema({
  mid: String, // 微博id
  content: String, // 微博内容
  uid: String,
  owner: String, // 博主名
  topic: String, // 事件主题
  repostNum: Number, // 转发量
  likeNum: Number, // 点赞量
  commentNum: Number, // 评论数
  postTime: Date, // 发布时间
  time: String
});

module.exports = mongoose.model('Weibo', weiboSchema);