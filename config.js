const MONGO_CONF = {
  host: 'localhost',
  url: 'mongodb://127.0.0.1:27017/weibo'
};

// redis
const  REDIS_CONF = {
  port: 6379,
  host: '127.0.0.1'
};

const loginInfo = {
  userName: '17792611892',
  passWord: 'XMYRZkn123'
};

module.exports = {
  MONGO_CONF,
  REDIS_CONF,
  loginInfo
};