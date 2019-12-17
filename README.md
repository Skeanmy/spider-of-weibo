# Nodejs新浪微博爬虫
使用说明
```sh
npm i
npm run spider
```
> 注意：nodejs版本要在10以上
## 目录结构说明
- `bin`目录：父进程监听主进程`app.js`，遇到请求错误或者其他错误自动重启
- `db`目录：数据库配置，采用mongodb和redis
- `lib`目录：`weibo.cn`以及`weibo.com`两个站点的登录函数
- `logs`目录：记录错误日志
- `util`目录：工具函数，包括格式化时间，查询数据库以及各种请求等
## 实现的功能
- 从`weibo.com`登录并且爬取特定话题下的微博帖子
  ```js
  // 爬取特定主题下的原始微博
  const topicName = "莫雷";
  for (let i = 1; i <= 50; i++) {
    await sleep(1000);
    try {
      let result = await getWeiboTopicHtml(topicName, i);
      parseWeiboHtml(topicName, result);
    } catch (e) {
      console.log(e);
      return;
    }
  }
  ```
  
- 解析具体的微博帖子，获取微博的转发信息

  ```js
  // 爬取特定微博的转发
  let mid = '4427710178645487';
  let url = `https://weibo.com/aj/v6/mblog/info/big?ajwvr=6&id=${mid}&__rnd=${Date.now()}`;
  let allPage = await getRepostPages(url);
  handleRepost(url, allPage, mid);
  ```

- 获取具体参与用户的用户信息，包含其粉丝列表和关注列表

  ```js
  // 用户信息
  getUserInfo();
  getUserFansOrFollows();
  ```

  