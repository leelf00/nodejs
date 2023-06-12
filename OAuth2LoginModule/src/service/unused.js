var child_procress = require('child_process');
const spawn = require('child_process').spawn;
var ngrok = null;
var killprocess = null;
exports.ngrok_domain = '';

//启动ngrok
exports.startNgrok = function startNgrok(){
  return new Promise((resolve, reject) => {
    child_procress.exec('nohup /home/ngrok/ngrok http -region ap 80 &' , function(err, stdout,stderr){
      if(err) console.log(`stderr: ${stderr}`);
      resolve(true);
    });
  });
  // ngrok = spawn('/home/ngrok/ngrok', ['http', '-region', 'ap', '80']);
  // ngrok.stdout.on('data', (data) => {
  //   console.log(`ngrok stdout: ${data}`);
  // });
  // //发生错误时
  // ngrok.stderr.on('data', (data) => {
  //   console.log(`ngrok stderr: ${data}`);
  // });
  // //关闭时
  // ngrok.on('close', (code) => {
  //   console.log(`ngrok child process exited with code ${code}`);
  // });
};

//获取ngrok的域名地址
exports.getNgrokIp = function getNgrokIp(){
  return new Promise((resolve, reject) => {
    setTimeout(function(){
      http.get('http://localhost:4040/api/tunnels/command_line', (res) => {
        let _body = '';
        res.on('data', (d) => {
            _body += d;
        });
        res.on('end', (r) => {
          try {
              let _body2 = JSON.parse(_body);
              console.log('ngrok domain: ',_body2.public_url);
              resolve(_body2.public_url);
          } catch (x) {
              console.log('json parse error:', x);
              reject(x);
          }
        });
      }).on('error', (e) => {
          console.error('getNgrokIp error:', e);
          reject(e);
      });
    },5000);

  });
}

//test方法，ls命令
exports.testLs = function testLs(){
  var ls = spawn('ls', ['/home']);
  ls.stdout.on('data', (data) => {
    console.log(`testLs stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.log(`testLs stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`testLs child process exited with code ${code}`);
  });
}

//杀掉ngrok进程
exports.killProcess = function killProcess(){
  return new Promise((resolve, reject) => {
    child_procress.exec('ps -ef|grep ngrok|grep -v grep|cut -c 9-15|xargs kill -9 &' , function(err, stdout,stderr){
      if(err) console.log(`stderr: ${stderr}`);
      resolve(true);
      //console.log(`stdout: ${stdout}`);
    });
  });
};

exports.createWechatMenu = function createWechatMenu() {
  return new Promise((resolve, reject) => {
    console.log('createWechatMenu:');
    let _menu = {
       "button":[
         {
                "name":"菜单",
                "sub_button":[
                {
                    "type":"view",
                    "name":"网厅",
                    "url": ngrok_domain
                 }]
          }
       ],
    };
    let post_data = JSON.stringify(_menu);
    console.log('post_data:',post_data);
    let _opts = {
      method: "POST",
      host: "api.weixin.qq.com",
      port: 443,
      path: "/cgi-bin/menu/create?access_token="+ wechat_access_token,
      headers: {
          "Content-Type": 'application/json',
          "Content-Length": post_data.length
      }
    };
    console.log('_opts:',_opts);


    let post_req = https.request(_opts, (serverFeedback) => {
      if (serverFeedback.statusCode == 200) {
        serverFeedback.on('data', function (data) { console.log('return data:',data); })
                      .on('end', function () { console.log('create menu success'); });
      }
      else {
        console.log(`serverFeedback error ${serverFeedback}`);
      }
    }).on('error', (e) => {
      console.error('createWechatMenu error:', e);
      reject(e);
    });
    // post the data
    post_req.write(post_data);
    console.log('post success?');
    post_req.end();
  });
}