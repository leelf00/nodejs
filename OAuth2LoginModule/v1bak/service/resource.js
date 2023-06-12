/* =========================================================
	路径判断程序
	@author fei
	@version 20160829
  @update 20160323 by fei 修改为严格模式提高性能
 * ========================================================= */
"use strict";
var cookieParser = require('cookie-parser')
var anyBody = require("body/any");
var xssdefence = require('../xssdef.js');
var redisClient = require('../redis.js');
var mysqlClient = require('../mysql.js');

var codeHandler = require('./code.js');
var authHandler = require('./auth.js');
var router = require('../router.js');
var logout = require('./logout.js');
const https = require('https');
const http = require('http');

// 系统配置文件
var appconfig = require('../config/config').appconfig;

// http connection keepalive模式
http.globalAgent.maxSockets = 500;
http.globalAgent.keepAliveMsecs = 1200;
http.globalAgent.keepAlive = true;

// https connection keepalive模式
https.globalAgent.maxSockets = 500;
https.globalAgent.keepAliveMsecs = 1200;
https.globalAgent.keepAlive = true;


/** 判断是否在白名单内 **/
function judgeurl(u, us) {
    let _u;
    for (_u of us) {
        if (u.startsWith(_u)) {
            return true;
        }
    }
    return false;
}

/** 解析权限列表按分号拆分一条多项 */
function parsepaths(paths) {
    var result = [];
    let path;
    for (path of paths) {
        if (path.indexOf(';') > 0) {
            path.split(';').forEach(o => {
                if(o!=''){
                  result.push(o);
                }
            });
        } else result.push(path);
    }
    return result;
}

/** 判断路径是否在权限允许数组内 */
function judgepath(p, ps, ml) {
    // console.log(`p:${p}`);
    // console.log(`ps:${ps}`);
    // console.log(`ml:${ml}`);
    ml = parsepaths(ml);
    if (ps.length == 0) {
        return true;
    } else {
        let _m;
        for (_m of ml) {
            if (p.startsWith(_m)) {
                let _p;
                for (_p of ps) {
                    if (_p != '' && p.startsWith(_p)) {
                        //console.log('in menu and has authority,the url is :', p);
                        return true;
                    }
                }
                console.log('in menu but has no authority,the url is :', p);
                return false;
            }
        }
        console.log('not in menu,the url is :', p);
        return false;
    }
}

exports.handleResource = function(app, _cache_server_urls, proxy, http, _whitelist, _menulist) {

    //POST模式的处理
    app.post('*', function(req, res) {
        var oreq = req;
        anyBody(req, res, function(err, body) {
            // 获取当前请求的Cookie
            var Cookies = req.cookies;
            //XSS攻击防御，发生xss攻击时直接return函数
            if (xssdefence.xssdefence(req, res, body)) {
                res.writeHead(401, {
                    "Content-type": "text/html"
                });
                res.write('XSS Attack');
                res.end();
                return;
            }
            //登陆请求和白名单地址不拦截，其他都拦截
            else if (judgeurl(req.url, _whitelist)) {
                if (req.cookies['_accessToken'] != undefined) {
                    redisClient.getClient().expire('S_session_' + req.cookies['_accessToken'] + '', appconfig.session_expire_second);
                    //TODO 未写刷新令牌
                }
                callback(req,body);
            }
            //非白名单无cookie的情况，直接返回未登录
            else if(Object.keys(Cookies).length === 0 || Cookies['_accessToken'] == undefined || Cookies['_fingerPrint'] == undefined){
                res.writeHead(401, {
                    "Content-type": "text/html"
                });
                res.write('Not logged in');
                res.end();
            }
            else if (!(Object.keys(Cookies).length === 0) && Cookies.hasOwnProperty('_accessToken') && Cookies.hasOwnProperty('_fingerPrint')) {

              redisClient.getClient().hgetall('S_session_' + Cookies['_accessToken'] + '', function(err, reply) {
                  if (!err) {
                      var _userSession = reply;
                      //比对redis中的accessToken是否一致，对比cookie中的指纹是否和redis中的一致，指纹在用户登陆的时候调用客户端的指纹js生成
                      //指纹算法过度依赖客户端，这里采用简单的算法
                      //如果对比下来一致，则通过反向代理访问目标地址
                      if (_userSession != null && _userSession.hasOwnProperty('_accessToken') && _userSession.hasOwnProperty('_fingerPrint') && Cookies['_accessToken'] == _userSession._accessToken && Cookies['_fingerPrint'] == _userSession._fingerPrint) {
                          //console.log(req.headers);
                          //通过授权
                          if(judgepath(req.url, _userSession.wss_path, _menulist)){
                            //延长当前session的过期时间
                            redisClient.getClient().expire('S_session_' + Cookies['_accessToken'] + '', appconfig.session_expire_second);
                            //判断是否更新访问令牌
                            redisClient.accessTokenRefreshJudgement(_userSession.merch_id, _userSession.login_user_account, _userSession._accessToken, res).then((val) => {
                                //异步记录日志
                                mysqlClient.logMerchUserAccess({
                                  merchantnum:_userSession.merch_id,
                                  user_id:_userSession.login_user_id,
                                  url:req.url,
                                  params:JSON.stringify(Object.assign({},req.query,body)),
                                  proxy_status_code:null,
                                  status_code:null,
                                  log_time:new Date(),
                                  fingerprint:Cookies['_fingerPrint'],
                                  account_name:_userSession.login_user_account,
                                  user_agent:req.headers['user-agent'],
                                });
                                callback(req,body);
                            });
                          }
                      }
                      //不一致则返回 http 401 标志位。因为是ajax请求所以无法触发304跳转，这里需要测试下 TODO
                      else {
                          res.writeHead(401, {
                              "Content-type": "text/html"
                          });
                          res.write('accessToken not the same');
                          res.end();
                      }

                  }
                  //redis获取发生异常
                  else {
                      console.log(err);
                  }
              });

            } else {
                console.log('No Authoritiy,url:',req.url);
                res.writeHead(401, {"Content-type": "text/html" });
                res.write('No Authoritiy');
                res.end();
                return;
            }

        });

        function callback(oreq,body) {
            //TODO 通过AccessToken和FingerPrint获取当前登陆用户，根据当前登录用户权限，判断是否在授权范围内
            // 执行反向代理，路由到不同的地址
            var target_url = router.urlrouter(req.url,_cache_server_urls);
            // if(!target_url.startsWith('http')&&!target_url.startsWith('ws')){
            //   if(req.headers.upgrade != 'websocket'){
            //       target_url = 'http://' + target_url;
            //   }else if (req.headers.connection == 'upgrade'){
            //       target_url = 'ws://' + target_url;
            //   }
            // }
            // console.log('target_url:',target_url);
            // console.log('oreq.method:',oreq.method);
            //修正proxy-web的路径问题
            var headers = {};
            if(oreq.method=="POST"){
                // var data = JSON.stringify(req.body);
                var data = "";
                let _pa;
                for(_pa in body){
                  data += _pa+'='+encodeURIComponent(body[_pa])+'&';
                };
                // console.log('body:',body);
                // console.log('data:',data);
                if(data.length>0){
                    data = data.substr(0,data.length - 1);
                }
                oreq.body = data;
                headers = {
                    "Content-Type": "application/json",
                    "Content-Length": data.length
                }

            }
            proxy.web(oreq, res, {
                target: target_url,
                secure: false,
                agent: http.globalAgent,
                xfwd: true,
                toProxy: false,
                changeOrigin: true,
                hostRewrite: req.headers.host + ':' + req.headers.port,
                autoRewrite: false,
                protocolRewrite: 'https'
            }); //changeOrigin:true,
        }


    });

    //GET模式的处理
    app.get('*', function(req, res) {
        var oreq = req;
        var Cookies = req.cookies;
            //XSS攻击防御，发生xss攻击时直接return函数
            if (xssdefence.xssdefence(req, res)) {
                res.writeHead(401, {
                    "Content-type": "text/html"
                });
                res.write('XSS Attack');
                res.end();
                return;
            }
            //登陆请求和白名单地址不拦截，其他都拦截
            else if (judgeurl(req.url, _whitelist)) {
                if (req.cookies['_accessToken'] != undefined) {
                    redisClient.getClient().expire('S_session_' + req.cookies['_accessToken'] + '', appconfig.session_expire_second);
                    //TODO 未写刷新令牌
                }
                callback(req);
            }
            //非白名单无cookie的情况
            else if(Object.keys(Cookies).length === 0 || Cookies['_accessToken'] == undefined || Cookies['_fingerPrint'] == undefined){
                res.writeHead(401, {
                    "Content-type": "text/html"
                });
                res.write('Not logged in');
                res.end();
            }
            else if (!(Object.keys(Cookies).length === 0) && Cookies.hasOwnProperty('_accessToken') && Cookies.hasOwnProperty('_fingerPrint')) {

              redisClient.getClient().hgetall('S_session_' + Cookies['_accessToken'] + '', function(err, reply) {
                  if (!err) {
                      var _userSession = reply;
                      //比对redis中的accessToken是否一致，对比cookie中的指纹是否和redis中的一致，指纹在用户登陆的时候调用客户端的指纹js生成
                      //指纹算法过度依赖客户端，这里采用简单的算法
                      //如果对比下来一致，则通过反向代理访问目标地址
                      if (_userSession != null && _userSession.hasOwnProperty('_accessToken') && _userSession.hasOwnProperty('_fingerPrint') && Cookies['_accessToken'] == _userSession._accessToken && Cookies['_fingerPrint'] == _userSession._fingerPrint) {
                          //console.log(req.headers);
                          //通过授权
                          if(judgepath(req.url, _userSession.wss_path, _menulist)){
                            //延长当前session的过期时间
                            redisClient.getClient().expire('S_session_' + Cookies['_accessToken'] + '', appconfig.session_expire_second);
                            //判断是否更新访问令牌
                            redisClient.accessTokenRefreshJudgement(_userSession.merch_id, _userSession.login_user_account, _userSession._accessToken, res).then((val) => {
                                //异步记录日志
                                mysqlClient.logMerchUserAccess({
                                  merchantnum:_userSession.merch_id,
                                  user_id:_userSession.login_user_id,
                                  url:req.url,
                                  params:JSON.stringify(req.query),
                                  proxy_status_code:null,
                                  status_code:null,
                                  log_time:new Date(),
                                  fingerprint:Cookies['_fingerPrint'],
                                  account_name:_userSession.login_user_account,
                                  user_agent:req.headers['user-agent'],
                                });
                                callback(req);
                            });
                          }


                      }
                      //不一致则返回 http 401 标志位。因为是ajax请求所以无法触发304跳转，这里需要测试下 TODO
                      else {
                          res.writeHead(401, {
                              "Content-type": "text/html"
                          });
                          res.write('accessToken not the same');
                          res.end();
                      }

                  }
                  //redis获取发生异常
                  else {
                      console.log(err);
                  }
              });

            } else {
                console.log('No Authoritiy');
                res.writeHead(401, {"Content-type": "text/html" });
                res.write('No Authoritiy');
                res.end();
                return;
            }

            function callback(oreq) {
                //console.log('in callback get,url is ',req.url);
                //TODO 通过AccessToken和FingerPrint获取当前登陆用户，根据当前登录用户权限，判断是否在授权范围内
                // 执行反向代理，路由到不同的地址
                var target_url = router.urlrouter(req.url,_cache_server_urls);
                // if(!target_url.startsWith('http')&&!target_url.startsWith('ws')){
                //   if(req.headers.upgrade != 'websocket'){
                //       target_url = 'http://' + target_url;
                //   }else if (req.headers.connection == 'upgrade'){
                //       target_url = 'ws://' + target_url;
                //   }
                // }
                // console.log('target_url:',target_url);
                // console.log('oreq.method:',oreq.method);

                proxy.web(oreq, res, {
                    target: target_url,
                    secure: false,
                    agent: http.globalAgent,
                    xfwd: true,
                    toProxy: false,
                    changeOrigin: true,
                    hostRewrite: req.headers.host + ':' + req.headers.port,
                    autoRewrite: false,
                    protocolRewrite: 'https'
                }); //changeOrigin:true,
            }

    });

}