/* =========================================================
	路径判断程序
	@author fei
	@version 20160829
  @update 20160323 by fei 修改为严格模式提高性能
 * ========================================================= */
//"use strict";
//var cookieParser = require('cookie-parser')
const Promise = require('bluebird');
const xssdefence = require('../xssdef');
const redisClient = require('../redis');
const mysqlClient = require('../mysql');
const sysrouter = require('../router');
//const bodyparser = require('body/any');
const https = require('https');
const http = require('http');
const anyBody = require("body/any");
// 系统配置文件
const appconfig = require('../config/config').appconfig;

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
        if (u.indexOf(_u)>-1) {
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

module.exports.handleResource = function handleResource(router,proxy) {
    //POST模式的处理
    router.post(/(|^$)/, function(ctx, next) {
      return new Promise((resolve,reject)=>{

          console.log(ctx.url);
          let req = ctx.req,res = ctx.res;
          ctx.respond = false;
          // 获取当前请求的Cookie
          let _accessToken = ctx.cookies.get('_accessToken'),_fingerPrint = ctx.cookies.get('_fingerPrint');
          //let body = ctx.request.body;
          //XSS攻击防御，发生xss攻击时直接return函数
          if (xssdefence.xssdefence(req, res, ctx.request.body)) {
              //console.log('bb001');
              res.writeHead(401, {
                  "Content-type": "text/html"
              });
              res.write('XSS Attack');
              res.end();
              return;
          }
          //登陆请求和白名单地址不拦截，其他都拦截
          else if (judgeurl(ctx.url, sysrouter._whitelist)) {
              if (ctx.cookies.get('_accessToken') != undefined) {
                  redisClient.getClient().expire(`S_session_${_accessToken}`, appconfig.session_expire_second);
                  //TODO 未写刷新令牌
              }
              //console.log('whitelist:',ctx.url);
              methodPostCallback(ctx,resolve);
          }
          //非白名单无cookie的情况，直接返回未登录
          else if(Object.keys(ctx.cookies).length === 0 || _accessToken === undefined || _fingerPrint === undefined){
              res.writeHead(401, {
                  "Content-type": "text/html"
              });
              res.write('Not logged in');
              res.end();
          }
          else if (!(Object.keys(ctx.cookies).length === 0) && _accessToken != 'undefined' && _fingerPrint != 'undefined') {
              return redisClient.getClient().hgetall(`S_session_${_accessToken}`, function(err, _userSession) {
                  if (err) console.log('resource err:',err);
                  if (!err) {
                      //比对redis中的accessToken是否一致，对比cookie中的指纹是否和redis中的一致，指纹在用户登陆的时候调用客户端的指纹js生成
                      //指纹算法过度依赖客户端，这里采用简单的算法
                      //如果对比下来一致，则通过反向代理访问目标地址
                      if (_userSession != null && _userSession.hasOwnProperty('_accessToken') && _userSession.hasOwnProperty('_fingerPrint') && ctx.cookies.get('_accessToken') == _userSession._accessToken && ctx.cookies.get('_fingerPrint') == _userSession._fingerPrint) {
                          //通过授权
                          if(judgepath(req.url, _userSession.wss_path, sysrouter._menulist)){
                            //延长当前session的过期时间
                            redisClient.getClient().expire(`S_session_${_accessToken}`, appconfig.session_expire_second);
                            //判断是否更新访问令牌
                            return redisClient.accessTokenRefreshJudgement(_userSession.merch_id, _userSession.login_user_account, _userSession._accessToken, res).then((val) => {
                              anyBody(ctx.req, ctx.res, function (err, body) {
                                //异步记录日志
                                mysqlClient.logMerchUserAccess({
                                  merchantnum:_userSession.merch_id,
                                  user_id:_userSession.login_user_id,
                                  url:req.url,
                                  params:JSON.stringify(Object.assign({},req.query,body)),
                                  proxy_status_code:null,
                                  status_code:null,
                                  log_time:new Date(),
                                  fingerprint:_fingerPrint,
                                  account_name:_userSession.login_user_account,
                                  user_agent:ctx.headers['user-agent'],
                                });
                                //console.log(Object.assign({},req.query,body));
                              });
                              methodPostCallback(ctx,resolve);
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
                  console.log('No Authoritiy,url:',ctx.url);
                  res.writeHead(401, {"Content-type": "text/html" });
                  res.write('No Authoritiy');
                  res.end();
                  return;
              }


        });

    });

    function methodPostCallback(ctx,resolve) {
        //TODO 通过AccessToken和FingerPrint获取当前登陆用户，根据当前登录用户权限，判断是否在授权范围内
        // 执行反向代理，路由到不同的地址
        let target_url = sysrouter.urlrouter(ctx.url,sysrouter._cache_server_urls);

        proxy.web(ctx.req, ctx.res, {
            target: target_url,
            secure: false,
            agent: http.globalAgent,
            xfwd: true,
            toProxy: false,
            changeOrigin: true,
            hostRewrite: `${ctx.request.headers.host}:${ctx.request.headers.port}`,
            autoRewrite: false,
            protocolRewrite: 'https'
            }
            ,function(e) {
              resolve(true);
            }

          );//changeOrigin:true,

        resolve(true);
    }

    //GET模式的处理
    router.get(/(|^$)/, function(ctx, next) {
        let req = ctx.req,res = ctx.res;
        ctx.respond = false;
        return new Promise((resolve,reject)=>{
          let _accessToken = ctx.cookies.get('_accessToken'),_fingerPrint = ctx.cookies.get('_fingerPrint');
          //XSS攻击防御，发生xss攻击时直接return函数
          if (xssdefence.xssdefence(ctx.req, ctx.res)) {
              ctx.res.writeHead(401, {
                  "Content-type": "text/html"
              });
              ctx.write('XSS Attack');
              ctx.end();
              return;
          }
          //登陆请求和白名单地址不拦截，其他都拦截
          else if (judgeurl(ctx.url, sysrouter._whitelist)) {
              if (ctx.cookies.get('_accessToken') != undefined) {
                  redisClient.getClient().expire(`S_session_${_accessToken}`, appconfig.session_expire_second);
                  //TODO 未写刷新令牌
              }
              methodGetCallback(ctx,resolve);
          }
          //非白名单无cookie的情况
          else if(Object.keys(ctx.cookies).length === 0 || _accessToken == undefined || _fingerPrint == undefined){
              ctx.res.writeHead(401, {
                  "Content-type": "text/html"
              });
              ctx.res.write('Not logged in');
              ctx.res.end();
          }
          else if (!(Object.keys(ctx.cookies).length === 0) && _accessToken != 'undefined' && _fingerPrint != 'undefined') {
              redisClient.getClient().hgetall(`S_session_${_accessToken}`, function(err, _userSession) {
                if (err) console.error('resource err:',err);
                if (!err) {
                    //比对redis中的accessToken是否一致，对比cookie中的指纹是否和redis中的一致，指纹在用户登陆的时候调用客户端的指纹js生成
                    //指纹算法过度依赖客户端，这里采用简单的算法
                    //如果对比下来一致，则通过反向代理访问目标地址
                    if (_userSession != null && _userSession.hasOwnProperty('_accessToken') && _userSession.hasOwnProperty('_fingerPrint') && _accessToken == _userSession._accessToken && _fingerPrint == _userSession._fingerPrint) {
                        //console.log(req.headers);
                        //通过授权
                        if(judgepath(ctx.url, _userSession.wss_path, sysrouter._menulist)){
                          //延长当前session的过期时间
                          redisClient.getClient().expire(`S_session_${_accessToken}`, appconfig.session_expire_second);
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
                                fingerprint:_fingerPrint,
                                account_name:_userSession.login_user_account,
                                user_agent:req.headers['user-agent'],
                              });
                              methodGetCallback(ctx,resolve);
                          });
                        }


                    }
                    //不一致则返回 http 401 标志位。因为是ajax请求所以无法触发304跳转，这里需要测试下 TODO
                    else {
                        ctx.res.writeHead(401, {
                            "Content-type": "text/html"
                        });
                        ctx.res.write('accessToken not the same');
                        ctx.res.end();
                    }

                }
                //redis获取发生异常
                else {
                    console.error(err);
                }
            });

          } else {
              console.error('No Authoritiy:',ctx.url);
              // ctx.status = 401;
              // ctx.body = 'No Authoritiy';
              // ctx.res.end();
              ctx.res.writeHead(401, {"Content-type": "text/html" });
              ctx.res.write('No Authoritiy');
              ctx.res.end();
              resolve();
              return;
          }


        })


    });

    function methodGetCallback(ctx,resolve){
      //console.log('in callback get,url is ',req.url);
      //TODO 通过AccessToken和FingerPrint获取当前登陆用户，根据当前登录用户权限，判断是否在授权范围内
      // 执行反向代理，路由到不同的地址
      let target_url = sysrouter.urlrouter(ctx.url,sysrouter._cache_server_urls);

      proxy.web(ctx.req, ctx.res, {
          target: target_url,
          secure: false,
          agent: http.globalAgent,
          xfwd: true,
          toProxy: false,
          changeOrigin: true,
          hostRewrite: `${ctx.request.headers.host}:${ctx.request.headers.port}`,
          autoRewrite: false,
          protocolRewrite: 'https'
      },function(e) {
        console.error(`Proxy err,url:${target_url}`);
      }); //changeOrigin:true,

      resolve(true);

    }

}