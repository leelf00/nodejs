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
  @update 20170116 by fei 增加代理服务器异常判断，优化部分redis代码
  @update 20170619 by fei 修改unix sock模式
 * ========================================================= */
'use strict';
const numCPUs = require('os').cpus().length;
const os = require('os');
// 系统配置文件
const appconfig = require('./config/config').appconfig;
const cluster = require('cluster');
const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const Koa = require('koa');
const app = new Koa();
const Router = require('koa-router');
const router = new Router();
//const bodyParser = require('koa-bodyparser');
const loginHandler = require('./service/login');
const sysrouter = require('./router');
const login_cHandler = require('./service/login_c');
const logoutHandler = require('./service/logout');
const ssoemuHandler = require('./service/ssoemu');
const resourceHandler = require('./service/resource');
//const testHandler = require('./test');

// 新建一个代理 Proxy Server 对象
var proxy = httpProxy.createServer(); //{ agent: myagent, xfwd: true, toProxy:true }

// 捕获异常
proxy.on('econnreset', function (err, errReq, errRes) {
  console.error(`[proxy]代理服务器异常 econnreset:${err.message}，请求地址：${errReq.url}`);
  console.error(`[proxy]代理服务器 req.headers:${JSON.stringify(errReq.headers)}`);
  errRes.end();
});
proxy.on('error', (err, req, res) => {
  console.error(`[proxy]代理服务器异常:${err.message}，请求地址：${req.url}`);
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
  //logHandler.logAccess(proxyRes, req, res,_menulist);
  if(proxyRes.headers.statusCode=='404'||proxyRes.headers.statusCode=='500'){
    res.writeHead(proxyRes.headers.statusCode, {"Content-type": "text/html"});
    res.write('error');
    res.end();
  }
});
proxy.on('proxyReq', (proxyReq, req, res, options) => {
  // if(req.method=="POST"&&req.body&&req.body.length>0){
  //     proxyReq.setHeader('content-length',req.body.length);
  //     proxyReq.write(req.body);
  //     proxyReq.end();
  // }
});
proxy.on('open', (proxySocket) => {
  proxySocket.on('data', function(){
  });
});
proxy.on('close', (res, socket, head) => {
  console.log(`[proxy]代理客户端断开`);
});
//proxy.listen(87);

// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log(`[server]监听: 工作线程 ${worker.process.pid},Address: ${address.address}:${address.port}`);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.error(`[server]工作线程线程${worker.process.pid}退出`);
    //尝试启动一个新的工作进程
    cluster.fork();
  });

  try{

    //linux下释放unix socket
    if(os.type().toUpperCase().match(/LINUX/g)&&fs.existsSync(appconfig.server_listen)){
      fs.unlinkSync(appconfig.server_listen);
    }

    if(appconfig.use_wechat_module===true){
      const wechatHandler = require('./service/wechat');
      wechatHandler.refreshToken();
      //2小时刷新令牌
      this.timmer = require('./redis').redisIntervalTimer(function refreshAccessToken() {
          require('./redis').standloneWork(function clusterRefreshAccessTokenTask() {
              return wechatHandler.refreshToken();
          })
      }, 7200 * 1000 - 10000);
    }

    //启动时添加商户缓存
    require('./mysql').putMerchConfigCache().then(val=>{
      console.log(`[mysql]商户缓存载入成功`);
    });

  }catch(e){
    console.error(e);
  }
}
// 工作节点
else {

  //监听每个访问地址
  sysrouter.refresh();

  //test
  //testHandler.testfunc(app);
  //登陆地址
  loginHandler.handleLogin(router);
  login_cHandler.handleLogin(router);
  //微信公众号登录功能
  if(appconfig.use_wechat_module===true){
    login_cHandler.handleWechatAutoLogin(router);
  }
  //登出地址
  logoutHandler.handleLogout(router);
  //html转换pdf的服务地址，不需要经过权限拦截
  if(!os.arch().toUpperCase().match(/ARM/g)){
    require('./html2pdf').handleHtml2Pdf(router);
  }
  ssoemuHandler.handleGetUser(router);
  ssoemuHandler.handleGetMenu(router);

  //test
  //ssoemuHandler.handleTest(router);

  //全局其他地址过滤
  resourceHandler.handleResource(router,proxy);

  // app.use(bodyParser({
  //   formLimit:'100mb',
  //   onerror: function (err, ctx) {
  //     console.log('body parse error',err);
  //     //ctx.throw('body parse error', 422);
  //   }
  // }));
  app.use(router.routes()).use(router.allowedMethods());

  http.createServer(app.callback()).listen(appconfig.server_listen,() => {
    //unix_socket模式，设置文件为0777模式
    if(os.type().toUpperCase().match(/LINUX/g)){
      console.log(`[server]服务器绑定unix端口:${appconfig.server_listen}`);
      fs.chmodSync(appconfig.server_listen, '0777');
    }
  });
  //WebSocket
  // server.on('upgrade', (req, socket, head) => {
  //   var target_url = router.urlrouter(req.url,_cache_server_urls);
  //   //console.log(target_url);
  //   if(!target_url.startsWith('http')&&!target_url.startsWith('ws')){
  //     if(req.headers.upgrade != 'websocket'){
  //       target_url = 'http://' + target_url;
  //     }else if (req.headers.connection == 'upgrade'){
  //       target_url = 'ws://' + target_url;
  //     }
  //   }
  //   proxy.ws(req, socket, head, {target: target_url, secure: false, agent: http.globalAgent, xfwd: true, toProxy:true, ws:true});
  // });
  //server.listen(81);
  /** Oauth 2.0 客户端结束**/

}