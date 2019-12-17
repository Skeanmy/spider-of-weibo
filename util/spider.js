const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const moment = require('moment');
const pLimit = require('p-limit');
const limit = pLimit(5);
const { Repost, Weibo, User } = require('../db/schema');

const headers = {
  "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:48.0) Gecko/20100101 Firefox/48.0",
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Connection': 'Keep-Alive',
};
const m_cookies = fs.readFileSync('./cookies.txt');
const weibo_cookies = fs.readFileSync('./weibo_cookies.txt');

// 格式化时间
const normalizeTime = (oldTime) => {
  let newTime;
  let start = oldTime.indexOf('转赞');
  if (start > 0) {
    oldTime = oldTime.slice(0, start + 1);
  }
  if (oldTime.includes('刚')) {
    newTime = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }
  if (oldTime.includes('秒')) {
    let second = oldTime.match(/(\d+)(?=秒)/)[0];
    newTime = moment().subtract(second, 's').format('YYYY-MM-DD HH:mm:ss');
  }
  if (oldTime.includes('分钟')) {
    let min = oldTime.match(/(\d+)(?=分钟)/)[0];
    newTime = moment().subtract(min, 'm').format('YYYY-MM-DD HH:mm:ss');
  }
  if (oldTime.includes('今天')) {
    let now = oldTime.match(/(?<=今天)(.*)/)[0] + ":00";
    newTime = moment(Date.now()).format('YYYY-MM-DD') + ' ' + now;
  }
  if (oldTime.includes('月')) {
    newTime = '2019-' + oldTime.replace('月', '-').replace('日', '') + ":00";
    newTime = newTime.slice(0, 16) + ":00";
  }
  // console.log(newTime);
  return newTime;
};

// 进程暂停函数
const sleep = (time) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('ok');
    }, time);
  });
};

// 查询数据库
const findData = (schema, condition) => new Promise((resolve, reject) => {
  schema.find(condition, (err, docs) => {
    if (err) {
      reject(err);
    } else {
      resolve(docs);
    }
  });
});

// 转发的html
const getRepostHtml = (url, page) => {
  url = url + `&__rnd=${Date.now()}&page=${page}`;
  console.log(url);
  headers.cookie = weibo_cookies.toString();
  let options = {
    method: 'GET',
    url: url,
    headers: headers,
    gzip: true
  }
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        resolve(JSON.parse(response.body));
      } else {
        reject(error);
      }
    });
  });
}

// 获取转发最大页数
const getRepostPages = (url) => {
  headers.cookie = weibo_cookies.toString();
  let options = {
    method: 'GET',
    url: url,
    headers: headers,
    gzip: true
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        let { data: { page: { totalpage } } } = JSON.parse(response.body);
        resolve(totalpage);
      } else {
        reject(error);
      }
    });
  });
};

// 解析转发某一页的数据
const parseRepostHtml = (html, mid) => {
  let htmlData = html.data['html'];
  let $ = cheerio.load(htmlData);
  let repostItem;
  let repostItemTxt;
  $('.list_con').each((i, elem) => {
    repostItem = cheerio.load($(elem).html());
    // 注意： 这里一定要用空格表示后代，而不是用大于号。
    repostItemTxt = repostItem('.WB_text a').text().split(/@/);
    let obj = {};
    obj['content'] = repostItem('.WB_text span').text().trim();
    obj['mid'] = mid;
    obj['time'] = repostItem('.WB_func.clearfix .WB_from.S_txt2').text().trim();
    obj['postTime'] = repostItem('.WB_func.clearfix .WB_from.S_txt2 a').attr('date');
    obj['uname'] = repostItem('.WB_text > a').text();
    obj['uid'] = repostItem('.WB_text > a').attr('usercard').match(/(\d+)/)[0];
    console.log(obj);
    Repost.find({ content: obj['content'], uname: obj['uname'] }, (err, docs) => {
      if (err) {
        console.log('Repost:查询数据出错：' + err);
      }
      if (docs.length > 0) {
        console.log('Repost:数据已经存在');
      } else {
        let newRp = new Repost(obj);
        newRp.save(err => {
          if (err) {
            console.log('Repost:插入数据出错：' + err);
          } else {
            console.log('Repost:插入数据成功');
          }
        });
      }
    });
  });
};

// 处理某一条消息的转发
const handleRepost = (url, count, mid) => {
  let responseBody;
  (async () => {
    for (let i = 1; i <= count; i++) {
      console.log(`正在处理${mid}---第${i}页数据`, url);
      await sleep(1000);
      try {
        responseBody = await getRepostHtml(url, i);
      } catch (e) {
        console.log(responseBody);
        console.log('转发错误：' + e);
      }
      let totalpage = responseBody.data.page.totalpage;
      if (i <= totalpage) {
        parseRepostHtml(responseBody, mid);
      } else {
        break;
      }
    }
  })();
};

// 获取特定主题的微博
const getWeiboTopicHtml = (topic, page = 1) => {
  topic = encodeURI(topic);
  let options = {
    method: 'GET',
    url: `https://s.weibo.com/weibo?q=${topic}&Refer=topic_weibo&page=${page}`,
    headers: headers,
    gzip: true
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        resolve(response.body);
      } else {
        reject(error);
      }
    });
  });
};

// 解析特定主题下的一条微博
const parseWeiboHtml = (topicName, html) => {
  let $ = cheerio.load(html);
  let list = [];
  $('.card-wrap').each((index, ele) => {
    let element = cheerio.load($(ele).html());
    if ($(ele).attr('mid')) {
      let content = element('.content p.txt').text().trim();
      let owner = element('.content div.info a.name').text().trim();
      let topic = topicName;
      let repostNum = element('.card-act ul li:nth-child(2)').text().trim().match(/(\d)+/g) ? +element('.card-act ul li:nth-child(2)').text().trim().match(/(\d)+/g)[0] : 0;
      let likeNum = element('.card-act ul li:nth-child(4)').text().trim().match(/(\d)+/g) ? +element('.card-act ul li:nth-child(4)').text().trim().match(/(\d)+/g)[0] : 0;
      let commentNum = element('.card-act ul li:nth-child(3)').text().trim().match(/(\d)+/g) ? +element('.card-act ul li:nth-child(3)').text().trim().match(/(\d)+/g)[0] : 0;
      let time = element('.content>p.from>a:nth-child(1)').text().trim();
      let uid = element('.content .info .name').attr('href').match(/(?<=\/)(\d+)/g)[0];
      let mid = $(ele).attr('mid');
      let postTime = normalizeTime(time);
      if (content && owner) {
        let obj = {
          content,
          owner,
          topic,
          repostNum,
          likeNum,
          commentNum,
          postTime,
          time,
          mid,
          uid
        };
        console.log(obj);
        list.push(obj);
        Weibo.find({ content, owner, topic }, (err, docs) => {
          if (err) {
            console.log('Weibo:查询数据出错：' + err);
          }
          if (docs.length > 0) {
            console.log('Weibo:数据已经存在');
          } else {
            let newWb = new Weibo(obj);
            newWb.save(err => {
              if (err) {
                console.log('Weibo:插入数据出错：' + err);
              } else {
                console.log('Weibo:插入数据成功');
              }
            });
          }
        });
      }
    }
  });
};

// 
async function fetchInfo(uid) {
  headers.cookie = m_cookies.toString();
  let url = `https://m.weibo.cn/profile/info?uid=${uid}`;
  console.log(url);
  let options = {
    method: 'GET',
    url: url,
    headers: headers,
    gzip: true
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        resolve(response.body);
      } else {
        console.log('info:' + error);
        process.exit(1);
      }
    });
  });
};

// 获取用户基本信息，从weibo.cn获取，解析html
async function getProfile(uid) {
  headers.cookie = m_cookies.toString();
  let url = `https://weibo.cn/${uid}/profile`;
  console.log(`正在爬取url----->${url}`);
  let options = {
    method: 'GET',
    url: url,
    headers: headers,
    gzip: true
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        let $ = cheerio.load(response.body);
        let followCnt = $('div.u .tip2 a:nth-of-type(1)').text(),
          fansCnt = $('div.u .tip2 a:nth-of-type(2)').text(),
          weiboCnt = $('div.u .tip2 span').text(),
          profile = $('.ut span:nth-last-of-type(1)').text();
        let reg = /\[(\d+)\]/;
        followCnt = +followCnt.match(reg)[1];
        fansCnt = +fansCnt.match(reg)[1];
        weiboCnt = +weiboCnt.match(reg)[1];
        resolve({ followCnt, fansCnt, weiboCnt, profile });
      } else {
        reject(error);
      }
    });
  });
}

const getUserInfo = async () => {
  let weibos = await findData(Weibo, {});
  for (let wb of weibos) {
    let { owner, uid } = wb;
    console.log(uid, owner);
    let u = await findData(User, { uid });
    // 可能有一个用户参与多次发帖
    if (u.length == 0) {
      await sleep(500);
      // let fans = await getFansOrFollows(uid, 'fans');
      // let follows = await getFansOrFollows(uid, 'follow');

      // let { followCnt, fansCnt, weiboCnt, profile } = await getProfile(uid);

      let userInfo = JSON.parse(await fetchInfo(uid)).data;
      let { description, screen_name, follow_count, followers_count, statuses_count } = userInfo.user;
      let containerid = userInfo.fans.match(/(?<=\=).*?(?=\_)/)[0];

      let obj = {
        uname: screen_name,
        uid,
        followCnt: follow_count,
        weiboCnt: statuses_count,
        fansCnt: followers_count,
        fans: [], follows: [],
        profile: description,
        containerid
      };
      console.log(obj);
      let newUser = new User(obj);
      newUser.save(err => {
        if (err) {
          console.log('User:插入数据出错：' + err);
        } else {
          console.log('User:插入数据成功');
        }
      });
    };
  }
};

// 从用户主页获取到用户粉丝页
const fetchFansOrFollows = async (containerid, page, type = 'FANS') => {
  if (page) {
    await sleep(1000);
  }
  let url = `https://m.weibo.cn/api/container/getSecond?containerid=${containerid}_-_${type}` + (page ? `&page=${page}` : ``);
  console.log(url);
  let options = {
    method: 'GET',
    url: url,
    headers: headers,
    gzip: true
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        response.setEncoding('utf-8');
        resolve(response.body);
      } else {
        console.log('fans:' + error);
        process.exit(1);
      }
    });
  });
};

const getUserFansOrFollows = async () => {
  let users = await findData(User, {});
  for (let user of users) {
    let { uid, uname, fansCnt, followCnt, containerid, profile, weiboCnt } = user;
    let maxPage, fans, follows;
    if (fansCnt <= 10000000000000000) {
      // 判断是否爬过
      // let isIn = await findData(FUser, { uid });
      let isIn = [];
      if (isIn.length) {
        console.log(`${uid}--${owner}已经存在`);
      } else {
        let fansData = await fetchFansOrFollows(containerid);
        maxPage = JSON.parse(fansData).data.maxPage || Math.floor(fansCnt / 10);
        maxPage = maxPage > 20 ? 20 : maxPage;
        console.log(uname, uid, maxPage);
        let reqs = [...(new Array(+maxPage)).keys()].map(index => limit(() => fetchFansOrFollows(containerid, index + 1)));
        fans = await (async () => {
          return new Promise((resolve, reject) => {
            Promise.all(reqs).then(res => {
              let fin = res.filter(i => JSON.parse(i).ok === 1).map(item => {
                // console.log(JSON.parse(item));
                return JSON.parse(item).data.cards.map(e => {
                  let { id, screen_name, followers_count, follow_count } = e.user;
                  // return { id, screen_name, followers_count, follow_count };
                  return id;
                });
              });
              resolve(fin.flat());
            }).catch(err => {
              console.log("err", err);
            });
          });
        })();
        let followsData = await fetchFansOrFollows(containerid, null, 'FOLLOWERS');
        maxPage = JSON.parse(followsData).data.maxPage || Math.floor(followCnt / 10);
        maxPage = maxPage > 20 ? 20 : maxPage;
        let reqs2 = [...(new Array(+maxPage)).keys()].map(index => limit(() => fetchFansOrFollows(containerid, index + 1, 'FOLLOWERS')));
        follows = await (async () => {
          return new Promise((resolve, reject) => {
            Promise.all(reqs2).then(res => {
              let fin = res.filter(i => JSON.parse(i).ok === 1).map(item => {
                return JSON.parse(item).data.cards.map(e => {
                  let { id, screen_name, followers_count, follow_count } = e.user;
                  // return { id, screen_name, followers_count, follow_count };
                  return id;
                });
              });
              resolve(fin.flat());
            }).catch(err => {
              console.log("err", err);
            });
          });
        })();
        let obj = {
          uname, containerid,
          uid, followCnt, weiboCnt, fansCnt, fans, follows, profile
        };
        console.log(obj);
        User.updateOne({ uname, uid }, obj, (err, res) => {
          if (err) {
            console.log('User:更新出错');
          } else {
            console.log('User:更新数据成功');
          }
        });
      }
    }
  }
};

module.exports = {
  sleep,
  findData,
  getRepostPages,
  handleRepost,
  getWeiboTopicHtml,
  parseWeiboHtml,
  getUserInfo,
  getUserFansOrFollows
};