// 模拟登录weibo.cn
"use strict";
const req = require('request');
const fs = require('fs');
const querystring = require('querystring');
const j = req.jar()
const request = req.defaults({ jar: j });

class mweiboLogin {

  constructor(userName, userPwd) {
    // 用户名
    this.userName = userName;
    // 密码
    this.userPwd = userPwd;
    // 预登陆地址，不带base64编码后的用户名,用于获取登录信息
    this.preLoginUrl = "https://passport.weibo.cn/signin/login?entry=mweibo&r=https%3A%2F%2Fweibo.cn%2F&backTitle=%CE%A2%B2%A9&vt=";
    // 登录的网页地址
    this.loginUrl = "https://passport.weibo.cn/sso/login";
    // 跳转的主页
    this.finnalLoginUrl = "https://weibo.cn/";
  };

  init() {
    return (async () => {
      try {
        // 获取预登陆原始数据
        let preLoginInitData = await this.getPreLoginData();
        // 解析预登陆原始数据
        console.log('=======================================');
        let responseBody = await this.postData();
        return await this.getCookies(this.finnalLoginUrl);
      } catch(err) {
        console.log(err);
      }
    })();
  };

  // 获取预登录数据
  getPreLoginData() {
    return new Promise((resolve, reject) => {
      request(this.preLoginUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          resolve(response.body);
        } else {
          reject('没有获取到预登录数据');
        }
      });
    });
  };
  
  // post数据到服务器
  postData() {
    let headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36",
      'Accept-Language': 'zh-cn',
      'Content-Type':'application/x-www-form-urlencoded',
      'Connection': 'Keep-Alive',
      'referer': 'https://passport.weibo.cn/signin/login?entry=mweibo&r=https%3A%2F%2Fweibo.cn%2F&backTitle=%CE%A2%B2%A9&vt='
    };
    let encodeBody = {
      username: this.userName,
      password: this.userPwd,
      savestate: 1,
      r: 'https://weibo.cn/',
      ec: 0,
      pagerefer: 'https://weibo.cn/pub/',
      entry: 'mweibo',
      wentry: '',
      loginfrom: '',
      client_id: '',
      code: '',
      qq: '',
      mainpageflag: 1,
      hff: '',
      hfp: '',
    };
    let options = {
      method: 'POST',
      url: this.loginUrl,
      headers: headers,
      body: querystring.stringify(encodeBody),
      gzip: true
    };
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          response.setEncoding('utf-8');
          resolve(response.body);
        }
      });
    });
  };

  // 获取cookie
  getCookies(finnalLoginUrl) {
    return new Promise((resolve, reject) => {
      request.get({url: finnalLoginUrl, jar: j}, function (error, reponse, body) {
        let cookies = j.getCookieString(finnalLoginUrl);
        // console.log(cookies);
        // console.log('cookieJar:', j);
        fs.writeFile(__dirname + '/../cookies.txt', cookies, (error) => {
          if(error) {
            reject(0);
          }
          else {
            // console.log(reponse.body);
            resolve(reponse.body);
          }
        });
      });
    });
  };
}

module.exports = mweiboLogin;
