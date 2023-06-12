/* =========================================================
	C端用户登陆Service
	@author 李新翔，栗凌飞
	@version 20160418
	@update 20160418 首次提交
  @update 20160607
 * ========================================================= */
const Promise = require('bluebird');
const uuid = require('uuid');
var bodyParser = require('koa-bodyparser');
const xssdefence = require('../xssdef');
const redisClient = require('../redis');
const mysqlClient = require('../mysql');
const codeHandler = require('./code');
const authHandler = require('./auth');
// 系统配置文件
const appconfig = require('../config/config').appconfig;

module.exports.handleLogin = function(router) {
    router.post('/c_wss/login', bodyParser({
      formLimit:'100mb',
      onerror: function (err, ctx) {
        console.log('body parse error',err);
        //ctx.throw('body parse error', 422);
      }
    }),(ctx,next) => {
        var param = {};
        let req = ctx.req,res = ctx.res;
        ctx.cookies.set('failure_signal','').set('failure_message','');
        if (xssdefence.xssdefence(req, res)) return;
        var params = ctx.request.body || {};
        params.redirectURL = req.query.redirectURL;
        params.failureURL = req.query.failureURL;
        params.merchantnum = -999;
        params = Object.assign(params, param);
        return redisClient.getFailedLoginTimes(params).then((val)=>{
          if(val==true){
            params.schema = 'station';
            return mysqlClient.queryDateBaseFromC(params, "client_user").then((val2)=>{
              switchResult(val2,params,req,res,ctx);
            });
          }else{
            switchResult(4,params,req,res,ctx);
          }
        });

    });
}

//处理微信自动登录
module.exports.handleWechatAutoLogin = function (router) {
    router.get('/c_wss/wechat_autologin', function(ctx,next) {
        //如果参数里有code，则调用https到企鹅服务器查询用户openid
        if (ctx.query.code) {
            console.log('[微信用户登录]微信用户wechat_code:', ctx.query.code);
            //根据openid，在系统内自动登录
            return require('./wechat').getOpenId(ctx.query.code).then(val => {
                if(typeof val== 'undefined') {
                  ctx.status=401;
                  ctx.body='No openid';
                }
                console.log('[微信用户登录]微信用户wechat_openid:', val.openid);
                console.log('[微信用户登录]微信用户wechat_accesstoken:', val.access_token);
                console.log('[微信用户登录]微信用户wechat_refreshtoken:', val.refresh_token);
                var param = {
                    wechat_openid: val.openid,
                    wechat_access_token: val.access_token,
                    wechat_refresh_token: val.refresh_token,
                    username: val.openid,
                    wechat_login_type: 'auto'
                };
                let req = ctx.req,res = ctx.res;
                //ctx.cookies.set('failure_signal','').set('failure_message','');
                //if (xssdefence.xssdefence(req, res)) return;
                let params = {
                  merchantnum : -999
                };
                params = Object.assign(params, param);
                return redisClient.getFailedLoginTimes(params).then((fails)=>{
                  if(fails==true){
                    params.schema = 'station';
                    return mysqlClient.queryDateBaseFromC(params, "client_user").then((datav)=>{
                      return switchResult(datav,params,req,res,ctx);
                    });
                  }else{
                    return switchResult(4,params,req,res,ctx);
                  }
                });
            });
        } else {
            console.log('param:', ctx.req.query);
        }

    });

    //test v2
    router.get('/c_wss/wechat_autologinv2', function(ctx,next) {
        //如果参数里有code，则调用https到企鹅服务器查询用户openid
        if (ctx.query.code) {
            console.log('[微信用户登录]微信用户wechat_code:', ctx.query.code);
            //根据openid，在系统内自动登录
            return require('./wechat.js').getOpenId(ctx.query.code).then(val => {
                if(typeof val== 'undefined') {
                  ctx.status=401;
                  ctx.body='No openid';
                }
                console.log('[微信用户登录]微信用户wechat_openid:', val.openid);
                console.log('[微信用户登录]微信用户wechat_accesstoken:', val.access_token);
                console.log('[微信用户登录]微信用户wechat_refreshtoken:', val.refresh_token);
                //设置微信openid，写入cookie
                ctx.cookies.set('wechat_openid', val.openid, { expires: new Date(Date.now() + 86400000), httpOnly: true })
                var param = {
                    wechat_openid: val.openid,
                    wechat_access_token: val.access_token,
                    wechat_refresh_token: val.refresh_token,
                    username: val.openid,
                    wechat_login_type: 'auto'
                };
                let req = ctx.req,res = ctx.res;
                //ctx.cookies.set('failure_signal','').set('failure_message','');
                //if (xssdefence.xssdefence(req, res)) return;
                let params = {
                  merchantnum : 9999
                };
                params = Object.assign(params, param);
                return redisClient.getFailedLoginTimes(params).then((fails)=>{
                  if(fails==true){
                    params.schema = 'station';
                    params.version = 'v2';
                    return mysqlClient.queryDateBaseFromC(params, "client_user").then((datav)=>{
                      return switchResult(datav,params,req,res,ctx);
                    });
                  }else{
                    params.version = 'v2';
                    return switchResult(4,params,req,res,ctx);
                  }
                });
            });
        } else {
            console.log('param:', ctx.req.query);
        }

    });

    //微信正常登录
    router.post('/c_wss/wechat_login', (ctx,next) => {
        var param = {};
        let _accessToken = ctx.cookies.get('_accessToken') || '';
        redisClient.getClient().hgetall('S_session_' + _accessToken, function(err, reply) {
          if (reply['wechat_openid'] != undefined) {
              param['wechat_openid'] = reply['wechat_openid'];
              param['wechat_login_type'] = 'username';
              console.log('param&map:', param);
              let req = ctx.req,res = ctx.res;
              ctx.cookies.set('failure_signal','').set('failure_message','');
              if (xssdefence.xssdefence(req, res)) return;
              var params = ctx.request.body || {};
              params.redirectURL = req.query.redirectURL;
              params.failureURL = req.query.failureURL;
              params.merchantnum = -999;
              params = Object.assign(params, param);
              return redisClient.getFailedLoginTimes(params).then((val)=>{
                if(val==true){
                  params.schema = 'station';
                  return mysqlClient.queryDateBaseFromC(params, "client_user").then((val2)=>{
                    switchResult(val2,params,req,res,ctx);
                  });
                }else{
                  switchResult(4,params,req,res,ctx);
                }
              });
          }
        })

    });
};

/** 结果处理 **/
var switchResult = (result,params,req,res,ctx) => {
    console.log('case:',result);
    switch (result) {
        case 1:
            //商户号不存在
            res.cookie('failure_signal', '1');
            res.cookie('failure_message', '所输入的商户号不存在');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 2:
            //用户名不存在
            res.cookie('failure_signal', '2');
            res.cookie('failure_message', '所输入的用户名不存在');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 3:
            //登录类型不正确
            res.cookie('failure_signal', '3');
            res.cookie('failure_message', '账户登录类型不正确');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 4:
            //用户被锁定
            res.cookie('failure_signal', '4');
            res.cookie('failure_message', '用户被锁定');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 5:
            //密码错误
            let _time_long = redisClient.recordLastLoginFailed(params);
            res.cookie('failure_signal', '5');
            res.cookie('failure_message', '密码错误');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 6:
            let uuid_accesstoken_w = authHandler.handleAuthFromSelf();
            let uuid_refreshtoken_w = authHandler.handleRefreshToken();
            // 向客户端设置一个Cookie
            ctx.cookies.set('failure_signal', '0', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_accessToken', uuid_accesstoken_w, { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_refreshToken', uuid_refreshtoken_w, { expires: new Date(Date.now() + 86400000), httpOnly: true });
            params.accesstoken = uuid_accesstoken_w;
            params.refreshtoken = uuid_refreshtoken_w;
            params.clientid = uuid.v1();
            params.useragent = ctx.headers['user-agent'];
            if (ctx.headers['x-real-ip'] == null || ctx.headers['x-real-ip'] == undefined) {
                params.ipaddr = req.connection.remoteAddress;
            } else {
                params.ipaddr = ctx.headers['x-real-ip'];
            }
            return redisClient.loginConflict(uuid_accesstoken_w, params, "client_user").then(conflict=>{
              if(conflict){
                mysqlClient.insertLoginHistoryC(params);
                //平台会员的商户号默认-999
                params.merch_id = -999;
                return redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken_w, '', params,'').then(afp=>{
                  // mysqlClient.getAuthorizedPath(params.username, params.schema, "client", "app").then((r)=>{
                  //   redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken_w, _fingerprint, params,JSON.stringify(r));
                  // });
                  ctx.status = 302;
                  if(typeof params['version']!='undefined'&&params['version']=='v2'){
                    console.log('v2');
                    //ctx.redirect('/wechat/index.html');
                    ctx.redirect('/dist/');
                  }else{

                    ctx.redirect('/sso_wss/wechat/main/index?failure_signal=0');
                  }

                });
              }else{
                ctx.status = 302;
                if(typeof params['version']!='undefined'&&params['version']=='v2'){
                  console.log('v2');
                  //ctx.redirect('/wechat/index.html');
                  ctx.redirect('/dist/');
                }else{
                  ctx.redirect('/sso_wss/wechat/main/index?failure_signal=0');
                }
              }
            })
            break;

        case 7:
            //微信登陆密码错误
            let _time_long2 = redisClient.recordLastLoginFailed(params);
            res.cookie('failure_signal', '7');
            res.cookie('failure_message', '微信登陆密码错误');
            res.redirect(302, params.failureURL);
            res.end();
            break;
        case 8:
            //账号密码不匹配
            ctx.cookies.set('failure_signal', '8', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('failure_message', '账号密码不匹配', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            ctx.status = 302;
            ctx.redirect(params.redirectURL);
            break;

        case 9:
            //微信未绑定登陆
            ctx.cookies.set('failure_signal', '9', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_accessToken', params.wechat_openid, { expires: new Date(Date.now() + 86400000), httpOnly: true })
            redisClient.setAccesstokenWhenUnregisteredUserLogin(params);
            ctx.status = 302;
            //ctx.redirect('/sso_wss/wechat/main/index?failure_signal=9&failure_message=notboundopenid');
            if(typeof params['version']!='undefined'&&params['version']=='v2'){
              console.log('v2');
              //ctx.redirect('/wechat/index.html');
              ctx.redirect('/dist/');
            }else{
              ctx.redirect('/dist/');
            }
            break;

        case 10:
            //openid不匹配
            res.cookie('failure_signal', '10');
            res.cookie('failure_message', 'openid不匹配');
            res.redirect(302, params.failureURL);
            res.end();
            break;

        case 11:
            //autologin未开启
            ctx.cookies.set('failure_signal', '11', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('failure_message', 'autologin_not_inuse', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_accessToken', params.wechat_openid, { expires: new Date(Date.now() + 86400000), httpOnly: true });
            redisClient.setAccesstokenWhenUnregisteredUserLogin(params);
            ctx.status = 302;
            ctx.redirect('/sso_wss/wechat/main/index?failure_signal=11');
            break;
        case 12:
            res.cookie('failure_signal', '12');
            res.cookie('failure_message', '验证码错误');
            res.redirect(302, params.failureURL+'?failure_signal=12');
            res.end();
            break;
        case 0:

            let uuid_accesstoken = authHandler.handleAuthFromSelf();
            let uuid_refreshtoken = authHandler.handleRefreshToken();
            var _fingerprint = params.fingerprint;
            // 向客户端设置一个Cookie
            ctx.cookies.set('failure_signal', '0', { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_accessToken', uuid_accesstoken, { expires: new Date(Date.now() + 86400000), httpOnly: true })
            .set('_refreshToken', uuid_refreshtoken, { expires: new Date(Date.now() + 86400000), httpOnly: true });
            params.accesstoken = uuid_accesstoken;
            params.refreshtoken = uuid_refreshtoken;
            params.clientid = uuid.v1();
            params.useragent = ctx.headers['user-agent'];
            if (ctx.headers['x-real-ip'] == null || ctx.headers['x-real-ip'] == undefined) {
                params.ipaddr = req.connection.remoteAddress;
            } else {
                params.ipaddr = ctx.headers['x-real-ip'];
            }
            return redisClient.loginConflict(uuid_accesstoken, params, "client_user").then(conflict=>{
              if(conflict){
                mysqlClient.insertLoginHistoryC(params);
                return redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, '', params,'').then(afp=>{
                  // mysqlClient.getAuthorizedPath(params.username, params.schema, "client", "app").then((r)=>{
                  //   redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken_w, _fingerprint, params,JSON.stringify(r));
                  // });
                  ctx.status = 302;
                  ctx.redirect('/sso_wss/wechat/main/index?failure_signal=0');
                });
              }else{
                ctx.status = 302;
                ctx.redirect('/sso_wss/wechat/main/index?failure_signal=0');
              }
            })
              break;
        default:
            console.log('default');
    };
};