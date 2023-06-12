/* =========================================================
	登陆Service
	@author
	@version 20160418
	@update 20160418 首次提交
 * ========================================================= */
'use strict';
const Promise = require('bluebird');
const uuid = require('uuid');
const bodyParser = require('koa-bodyparser');
const xssdefence = require('../xssdef');
const redisClient  = require('../redis');
const mysqlClient = require('../mysql');
const codeHandler = require('./code');
const authHandler = require('./auth');
// 系统配置文件
const appconfig = require('../config/config').appconfig;

module.exports.handleLogin = function (router) {
  router.post('/b_wss/login', bodyParser({
    formLimit:'100mb',
    onerror: function (err, ctx) {
      console.error('body parse error',err);
      //ctx.throw('body parse error', 422);
    }
  }),function (ctx,next) {
    //ctx.respond = false;
    ctx.cookies.set('failure_signal','').set('failure_message','');
    if (xssdefence.xssdefence(ctx.req, ctx.res)) return;
    var params = ctx.request.body;
    console.log('params:',params);
    return redisClient.getFailedLoginTimes(params).then(val=>{
      //用户锁定状态，临时锁定
      if(val==true){
        // params.schema = 'station';
        return mysqlClient.queryDateBase(params, "sys_user").then(val2=>{
          return switchResult(val2,params,ctx);
        });
      }else{
        switchResult(4,params,ctx);
      }
    });
  });
}

function switchResult(result,params,ctx) {
  //console.log(result);
  //cookie写入中文有兼容性问题
  switch (result) {
    case 1:
      return new Promise((resolve,reject)=>{
        ctx.cookies.set('failure_signal', '1', { expires: new Date(Date.now() + 86400000), httpOnly: true });
        ctx.status = 302;
        ctx.redirect(appconfig.login_config.failure_redirect_url);
        resolve();
      });
      break;
    case 2:
        //json方式返回
        if ('undefined' != typeof params.login_type && params.login_type=='json') {
          ctx.response.type='application/json';
          ctx.body = JSON.stringify({error:'用户名或密码错'});
        }else{
          ctx.cookies.set('failure_signal', '2', { expires: new Date(Date.now() + 86400000), httpOnly: true });
          ctx.status = 302;
          ctx.redirect(appconfig.login_config.failure_redirect_url);
        }
      break;
    case 3:
        //登陆类型错误
        ctx.cookies.set('failure_signal', '3', { expires: new Date(Date.now() + 86400000), httpOnly: true });
        ctx.status = 302;
        ctx.redirect(appconfig.login_config.failure_redirect_url);
      break;
    case 4:
        //json方式返回
        if ('undefined' != typeof params.login_type && params.login_type=='json') {
          ctx.response.type='application/json';
          ctx.body = JSON.stringify({error:'用户密码输入错误次数过多，用户锁定'});
        }else{
          ctx.cookies.set('failure_signal', '4', { expires: new Date(Date.now() + 86400000), httpOnly: true });
          ctx.status = 302;
          ctx.redirect(appconfig.login_config.failure_redirect_url);
        }
      break;
    case 5:
        redisClient.recordLastLoginFailed(params);
        //json方式返回
        if ('undefined' != typeof params.login_type && params.login_type=='json') {
          ctx.response.type='application/json';
          ctx.body = JSON.stringify({error:'用户名或密码错'});
        }else{
          ctx.cookies.set('failure_signal', '5', { expires: new Date(Date.now() + 86400000), httpOnly: true });
          ctx.status = 302;
          ctx.redirect(appconfig.login_config.failure_redirect_url);
        }
      break;
    case 6:
      let uuid_accesstoken_w = authHandler.handleAuthFromSelf();
      let uuid_refreshtoken_w = authHandler.handleRefreshToken();
      let _fingerprint_w = params.fingerprint;
      // 向客户端设置一个Cookie
      ctx.cookies.set('_accessToken', uuid_accesstoken_w, { expires: new Date(Date.now() + 86400000), httpOnly: true })
      .set('_fingerPrint', _fingerprint_w, { expires: new Date(Date.now() + 86400000), httpOnly: true })
      .set('_refreshToken', uuid_refreshtoken_w, { expires: new Date(Date.now() + 86400000), httpOnly: true });
      params.accesstoken = uuid_accesstoken_w;
      params.refreshtoken = uuid_refreshtoken_w;
      params.clientid = uuid.v1();
      params.useragent = ctx.headers['user-agent'];
      if (ctx.headers['x-real-ip'] == null || ctx.headers['x-real-ip'] == undefined) {
        params.ipaddr = ctx.req.connection.remoteAddress;
      }
      else {
        params.ipaddr = ctx.req.headers['x-real-ip'];
      }
      return redisClient.loginConflict(uuid_accesstoken_w, params,"sys_user").then(conflict=>{
        if(conflict){
          mysqlClient.insertLoginHistory(params);
          //修改成mysql触发器
          return mysqlClient.getAuthorizedPath(params.username,params.schema,"sys",callback,"role").then(r=>{
              return redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken_w, _fingerprint_w, params,r);
          });
          ctx.status = 302;
          ctx.redirect(params.redirectURL);
        }
        else{
          ctx.status = 302;
          ctx.redirect(params.failureURL);
        }
      });

      break;

    case 7:
      let _time_long = redisClient.recordLastLoginFailed(params);
      ctx.cookies.set('failure_signal', '7', { expires: new Date(Date.now() + 86400000), httpOnly: true })
      ctx.status = 302;
      ctx.redirect(params.redirectURL);
      break;

    case 8:
      //json方式返回
      if ('undefined' != typeof params.login_type && params.login_type=='json') {
        ctx.response.type='application/json';
        ctx.body = JSON.stringify({error:'用户密码异常，请联系管理员'});
      }else{
        ctx.cookies.set('failure_signal', '8', { expires: new Date(Date.now() + 86400000), httpOnly: true })
        ctx.status = 302;
        ctx.redirect(params.redirectURL);
        break;
      }
    case 0:
        // var code = codeHandler.handleCodeFromSelf(params);
        let uuid_accesstoken = authHandler.handleAuthFromSelf(),uuid_refreshtoken = authHandler.handleRefreshToken(),_fingerprint = params.fingerprint;
        // 向客户端设置一个Cookie
        ctx.cookies.set('_accessToken', uuid_accesstoken, { expires: new Date(Date.now() + 86400000), httpOnly: true })
        .set('_fingerPrint', _fingerprint, { expires: new Date(Date.now() + 86400000), httpOnly: true })
        .set('_refreshToken', uuid_refreshtoken, { expires: new Date(Date.now() + 86400000), httpOnly: true })
        .set('merch', params.merchantnum, { expires: new Date(Date.now() + 86400000), httpOnly: true });

        params.accesstoken = uuid_accesstoken;
        params.refreshtoken = uuid_refreshtoken;
        params.clientid = uuid.v1();
        params.useragent = ctx.headers['user-agent'];
        if (ctx.headers['x-real-ip'] == null || ctx.headers['x-real-ip'] == undefined) {
          params.ipaddr = ctx.req.connection.remoteAddress;
        }
        else {
          params.ipaddr = ctx.headers['x-real-ip'];
        }
        return redisClient.loginConflict(uuid_accesstoken, params,"sys_user").then(conflict=>{
          if(conflict){
            //mysqlClient.updateLoginCurrent(params,"sys_user");
            return Promise.all([mysqlClient.getUserLastLoginTime(params),mysqlClient.getAuthorizedPath(params.username,params.schema,"sys","role")])
            .then(vv=>{
              return redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, _fingerprint, Object.assign(params,vv[0]),JSON.stringify(vv[1])).then(v=>{
                //json方式返回
                if (!(params.login_type===undefined) && params.login_type=='json') {
                  //console.log('in json login');
                  ctx.response.type = 'application/json; charset=utf-8';
                  params.return_code = 'success';
                  mysqlClient.insertLoginHistory(params);
                  ctx.body = JSON.stringify(params);
                  //console.log('end',params);
                }else{
                  ctx.status = 302;
                  ctx.redirect(appconfig.login_config.success_redirect_url);
                  mysqlClient.insertLoginHistory(params);
                  console.log(appconfig.login_config.success_redirect_url);
                }
              });
            });
          }
          else{
            ctx.status = 401;
            ctx.body = 'login conflict';
            //resolve(true);
          }
        });


      break;
    default:
      console.log('default');
  };
}


