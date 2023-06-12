/* =========================================================
	主程序
	@author
	@version 20160330
	@update 20160323 by fei 首次提交,代理服务器为http模式，http=>https由nginx完成
  @update 20160330 by fei 增加Cookie中AccessToken对比,增加Cookie中的FingerPrint对比
  @update 20160407 by fei 增加配置文件
  @update 20160415 by fei 增加XSS反注入攻击
  @update 20160419 by fei 部分修正WebSocket无法代理问题
  @update 20160425 by fei 在工作线程崩溃时尝试重新启动一个新的工作线程
  @update 20160505 by fei 在后端返回404和500错时只返回head部分，不返回body部分
 * ========================================================= */
var cluster = require('cluster');
var http = require('http');
var httpProxy = require('http-proxy');
var numCPUs = require('os').cpus().length;
var redisClient  = require('./redis.js');
var mysqlClient = require('./mysql.js');
var utils = require('./utils.js');
var express = require('express');
var cookieParser = require('cookie-parser')
var xssdefence = require('./xssdef.js');
var loginHandler = require('./service/login.js');
var login_cHandler = require('./service/login_c.js');
var logoutHandler = require('./service/logout.js');
var codeHandler = require('./service/code.js');
var authHandler = require('./service/auth.js');
var resourceHandler = require('./service/resource.js');
var wechatHandler = require('./service/wechat.js');
var logHandler = require('./service/log.js');
var router = require('./router.js');
var html2pdf = require('./html2pdf');
//var testHandler = require('./test');

// 系统配置文件
var appconfig = require('./config/config').appconfig;

// 初始化缓存服务器路径
var _cache_server_urls = {};
// 初始化白名单,初始化菜单表
var _whitelist = _menulist = [];

// 新建一个代理 Proxy Server 对象
var proxy = httpProxy.createServer(); //{ agent: myagent, xfwd: true, toProxy:true }

// 捕获异常
proxy.on('econnreset', function (err, errReq, errRes) {
  console.log('代理服务器异常 econnreset:', err.message ,'，请求地址：', errReq.url);
  console.log('req.headers:',errReq.headers);
  errRes.end();
});
proxy.on('error', (err, req, res) => {
  console.log('代理服务器异常:', err.message ,'，请求地址：', req.url);
  //console.log('req.headers:',req.headers);
  res.end();
  //TODO retry 机制
  //console.log(res.socket.destroyed);
});

proxy.on('end', () => {
  //console.log('proxied');
})
//代理服务器接收到响应头的时候
proxy.on('proxyRes', (proxyRes, req, res) => {
  //如果是404，500错，直接返回头不返回body
  // logHandler.logAccess(proxyRes, req, res,_menulist);
  if(proxyRes.headers.statusCode=='404'||proxyRes.headers.statusCode=='500'){
    res.writeHead(proxyRes.headers.statusCode, {"Content-type": "text/html"});
    res.write('error');
    res.end();
  }
});
proxy.on('proxyReq', (proxyReq, req, res, options) => {
  if(req.method=="POST"&&req.body&&req.body.length>0){
      proxyReq.setHeader('content-length',req.body.length);
      proxyReq.write(req.body);
      proxyReq.end();
  }
});
proxy.on('open', (proxySocket) => {
  proxySocket.on('data', function(){
  });
});
proxy.on('close', (res, socket, head) => {
  console.log('代理客户端断开');
});
//proxy.listen(9005);

// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log('监听: 工作线程 ' + worker.process.pid +', Address: '+address.address+":"+address.port);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log('工作线程线程 ' + worker.process.pid + ' 退出');
    //尝试启动一个新的工作进程
    cluster.fork();
  });

}
// 工作节点
else {

  /** Oauth 2.0 客户端开始 **/
  var app = express();
  // 去掉x-power-by Express 的header
  app.disable('x-powered-by');
  var server = http.createServer(app);
  //cookie解析器
  app.use(cookieParser());

  //html转换pdf的服务地址，不需要经过权限拦截
  html2pdf.handleHtml2Pdf(app);

  var urls = [];
  //test
  //testHandler.testfunc(app);
  //登陆地址
  loginHandler.handleLogin(app);
  login_cHandler.handleLogin(app);
  //登出地址
  logoutHandler.handleLogout(app);
  //根据用户名密码，发放授权码
  codeHandler.handleCode(app);
  //根据授权码，发放AccessToken
  authHandler.handleAuth(app);
  //wechat,TO-DO
  wechatHandler.handleWechatAutoLogin(app);
  //监听每个访问地址
  mysqlClient.getRouterMap({}).then((val)=>{ _cache_server_urls = val; return mysqlClient.getWhitelist([])})
    .then((v2)=>{_whitelist = v2; return mysqlClient.getMenuList([])})
      .then((v3)=>{_menulist = v3; resourceHandler.handleResource(app,_cache_server_urls,proxy,http,_whitelist,_menulist)});

  // WebSocket
  server.on('upgrade', (req, socket, head) => {
    var target_url = router.urlrouter(req.url,_cache_server_urls);
    //console.log(target_url);
    if(!target_url.startsWith('http')&&!target_url.startsWith('ws')){
      if(req.headers.upgrade != 'websocket'){
        target_url = 'http://' + target_url;
      }else if (req.headers.connection == 'upgrade'){
        target_url = 'ws://' + target_url;
      }
    }
    proxy.ws(req, socket, head, {target: target_url, secure: false, agent: http.globalAgent, xfwd: true, toProxy:true, ws:true});
  });
  server.listen(81);
  /** Oauth 2.0 客户端结束**/

}