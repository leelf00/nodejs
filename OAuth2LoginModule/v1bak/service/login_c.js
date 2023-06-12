/* =========================================================
	C端用户登陆Service
	@author 李新翔，栗凌飞
	@version 20160418
	@update 20160418 首次提交
  @update 20160607
 * ========================================================= */
var uuid = require('node-uuid');
var anyBody = require("body/any");
var xssdefence = require('../xssdef.js');
var redisClient = require('../redis.js');
var mysqlClient = require('../mysql.js');
var codeHandler = require('./code.js');
var authHandler = require('./auth.js');
// 系统配置文件
var appconfig = require('../config/config').appconfig;


exports.handleLogin = function(server, param) {
    server.post('/c_wss/login', (req, res) => {
        anyBody(req,function(err,body){
          var param = {};
          this.handleLogin_C(server, param, req, res, body);
        });
    });
}

exports.handleLogin_C = function(server, param, req, res, body) {
    //mysqlClient.getRouterMap();//测试方法
    res.clearCookie('failure_signal');
    res.clearCookie('failure_message');
    if (xssdefence.xssdefence(req, res)) return;
    var params = body || {};
    params.redirectURL = req.query.redirectURL;
    params.failureURL = req.query.failureURL;
    params.merchantnum = -999;
    params = Object.assign(params, param);
    redisClient.getFailedLoginTimes(params).then((val)=>{
      if(val==true){
        params.schema = 'station';
        mysqlClient.queryDateBaseFromC(params, "client_user").then((val2)=>{
          switchResult(val2,params,req,res);
        });
      }else{
        switchResult(4,params,req,res);
      }
    });//switchResult, queryDateBaseCallBack

};

/** 结果处理 **/
var switchResult = (result,params,req,res) => {
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
            var _time_long = redisClient.recordLastLoginFailed(params);
            res.cookie('failure_signal', '5');
            res.cookie('failure_message', '密码错误');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 6:
            var uuid_accesstoken = authHandler.handleAuthFromSelf();
            var uuid_refreshtoken = authHandler.handleRefreshToken();
            //var _fingerprint = params.fingerprint;
            // 向客户端设置一个Cookie
            res.cookie('failure_signal', '0');
            res.cookie('_accessToken', uuid_accesstoken, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            // res.cookie('_fingerPrint', _fingerprint, {
            //     expires: new Date(Date.now() + 86400000),
            //     httpOnly: true
            // });
            res.cookie('_refreshToken', uuid_refreshtoken, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            params.accesstoken = uuid_accesstoken;
            params.refreshtoken = uuid_refreshtoken;
            params.clientid = uuid.v1();
            params.useragent = req.headers['user-agent'];
            if (req.headers['x-real-ip'] == null || req.headers['x-real-ip'] == undefined) {
                params.ipaddr = req.connection.remoteAddress;
            } else {
                params.ipaddr = req.headers['x-real-ip'];
            }
            if (redisClient.loginConflict(uuid_accesstoken, params, "client_user")) {
                mysqlClient.insertLoginHistory(params, "client_user");
                mysqlClient.updateLoginCurrent(params, "client_user");
                mysqlClient.getAuthorizedPath(params.username, params.schema, "client", "app").then((r)=>{
                  redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, _fingerprint, params,JSON.stringify(r));
                });
                if(params.redirectURL == undefined) params.redirectURL = '/sso_wss/wechat/main/index';
                // res.redirect(302, '/iccard_wss/wechat/main/index?failure_signal=0');
                res.redirect(302, params.redirectURL+'?failure_signal=0');
            } else {
                res.redirect(302, '/sso_wss/wechat/main/index?failure_signal=0');
            }
            res.end();

            break;

        case 7:
            //微信登陆密码错误
            var _time_long = redisClient.recordLastLoginFailed(params);
            res.cookie('failure_signal', '7');
            res.cookie('failure_message', '微信登陆密码错误');
            res.redirect(302, params.failureURL);
            res.end();
            break;
        case 8:
            //账号密码不匹配
            res.cookie('failure_signal', '8');
            res.cookie('failure_message', '账号密码不匹配');
            res.redirect(302, params.redirectURL);
            res.end();
            break;
        case 9:
            //微信未绑定登陆
            console.log('params:',params);

            res.cookie('_accessToken', params.wechat_openid, {
            //expires: new Date(Date.now() + 86400000),
            httpOnly: true
            });
            redisClient.setAccesstokenWhenUnregisteredUserLogin(params);

            res.redirect(302, '/sso_wss/wechat/main/index?failure_signal=9&failure_message=notboundopenid');
            res.end();
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
            res.cookie('failure_signal', '11');
            res.cookie('failure_message', 'autologin未开启');
            res.cookie('_accessToken', params.wechat_openid, {
            //expires: new Date(Date.now() + 86400000),
            httpOnly: true
            });
            redisClient.setAccesstokenWhenUnregisteredUserLogin(params);
            res.redirect(302, '/sso_wss/wechat/main/index?failure_signal=11');
            res.end();
            break;
        case 12:
            res.cookie('failure_signal', '12');
            res.cookie('failure_message', '验证码错误');
            res.redirect(302, params.failureURL+'?failure_signal=12');
            res.end();
            break;
        case 0:

            // var code = codeHandler.handleCodeFromSelf(params);
            var uuid_accesstoken = authHandler.handleAuthFromSelf();
            var uuid_refreshtoken = authHandler.handleRefreshToken();
            // res.cookie('failure_signal', '6');
            // res.cookie('failure_message', '用户未授权');
            // res.redirect(302, appconfig.login_config.failure_redirect_url);
            // res.end();


            var _fingerprint = params.fingerprint;
            // 向客户端设置一个Cookie
            res.cookie('_accessToken', uuid_accesstoken, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            res.cookie('_fingerPrint', _fingerprint, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            res.cookie('_refreshToken', uuid_refreshtoken, {
                expires: new Date(Date.now() + 86400000),
                httpOnly: true
            });
            params.accesstoken = uuid_accesstoken;
            params.refreshtoken = uuid_refreshtoken;
            params.clientid = uuid.v1();
            params.useragent = req.headers['user-agent'];
            if (req.headers['x-real-ip'] == null || req.headers['x-real-ip'] == undefined) {
                params.ipaddr = req.connection.remoteAddress;
            } else {
                params.ipaddr = req.headers['x-real-ip'];
            }
            if (redisClient.loginConflict(uuid_accesstoken, params, "client_user")) {
                mysqlClient.insertLoginHistory(params, "client_user");
                mysqlClient.updateLoginCurrent(params, "client_user");
                mysqlClient.getAuthorizedPath(params.username, params.schema, "client", callback, "app").then((r)=>{
                  redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, _fingerprint, params, r);
                });
                //console.log('params:',params);
                res.redirect(302, params.redirectURL+"?failure_signal=0");
                res.end();
            } else {
                res.redirect(302, params.failureURL);
                res.end();
            }


            break;
        default:
            console.log('default');
    };
};