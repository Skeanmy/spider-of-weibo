let process = require('child_process');
let fs = require('fs');
// let ChildProcess  = process.fork('./index.js');
console.log('当前目录:', __dirname);
let ChildProcess  = process.fork('./app.js');
 
ChildProcess.on('exit', function (code) {
    console.log('process exits + ' + code);
    fs.appendFileSync('./logs/log.txt', `线程退出，code:${code}\n`);
    if(code !== 0) {
        console.log('正在重启中......');
        setTimeout(() => {
          process.fork('./bin/www.js');
        }, 1000 * 5);
    }
});