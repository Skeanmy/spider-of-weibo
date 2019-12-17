"use strict";
const mweiboLogin = require('./lib/m_weibo_login.js');
const weiboLogin = require('./lib/weibo_login.js');
const {
  sleep,
  findData,
  getRepostPages,
  handleRepost,
  getWeiboTopicHtml,
  parseWeiboHtml,
  getUserInfo,
  getUserFansOrFollows
} = require('./util/spider');
const { loginInfo } = require('./config');
const { userName, passWord } = loginInfo;

const topicName = "莫雷";
(async () => {
  // await new mweiboLogin(userName, passWord).init();
  await new weiboLogin(userName, passWord).init();
  try {
    //   let mid = '4427710178645487';
    //   // 爬取特定微博的转发
    //   let url = `https://weibo.com/aj/v6/mblog/info/big?ajwvr=6&id=${mid}&__rnd=${Date.now()}`;
    //   let allPage = await getRepostPages(url);
    //   console.log('allCnt:', allPage);
    //   handleRepost(url, allPage, mid);

    // 爬取特定主题下的原始微博
    for (let i = 1; i <= 50; i++) {
      console.log(`正在处理第${i}页数据`);
      await sleep(1000);
      try {
        let result = await getWeiboTopicHtml(topicName, i);
        parseWeiboHtml(topicName, result);
      } catch (e) {
        console.log(e);
        return;
      }
    }

    // 用户信息
    // getUserInfo();
    // getUserFansOrFollows();
  } catch (e) {
    console.log('最外层接受到错误:', e);
    process.exit(1);
  }

})();

