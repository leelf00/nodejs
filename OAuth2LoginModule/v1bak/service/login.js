/* =========================================================
	登陆Service
	@author
	@version 20160418
	@update 20160418 首次提交
 * ========================================================= */
var uuid = require('node-uuid');
var anyBody = require("body/any");
var xssdefence = require('../xssdef.js');
var redisClient  = require('../redis.js');
var mysqlClient = require('../mysql.js');
var codeHandler = require('./code.js');
var authHandler = require('./auth.js');
// 系统配置文件
var appconfig = require('../config/config').appconfig;


exports.handleLogin = function (server) {
  server.post('/b_wss/login', function (req,res) {

    anyBody(req,function(err,body){
      if(err) console.log('body err:',err);
      //mysqlClient.getRouterMap();//测试方法
      res.clearCookie('failure_signal');
      res.clearCookie('failure_message');
      if (xssdefence.xssdefence(req, res)) return;
      var params = body;
      console.log('params:',params);
      redisClient.getFailedLoginTimes(params).then((val)=>{
        if(val==true){
          // params.schema = 'station';
          mysqlClient.queryDateBase(params, "sys_user").then((val2)=>{
            switchResult(val2,params,req,res);
          });
        }else{
          switchResult(4,params,req,res);
        }
      });

    });

    function switchResult(result,params,req,res) {
      switch (result) {
        case 1:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("所输入的商户号不存在");
          res.cookie('failure_signal', '1');
          res.cookie('failure_message', '所输入的商户号不存在');
          res.redirect(302, appconfig.login_config.failure_redirect_url);
          res.end();
          break;
        case 2:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("所输入的用户名不存在");
          res.cookie('failure_signal', '2');
          res.cookie('failure_message', '所输入的用户名不存在');
          res.redirect(302, appconfig.login_config.failure_redirect_url);
          res.end();
          break;
        case 3:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("账户登录类型不正确");
          res.cookie('failure_signal', '3');
          res.cookie('failure_message', '账户登录类型不正确');
          res.redirect(302, appconfig.login_config.failure_redirect_url);
          res.end();
          break;
        case 4:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("用户被锁定");
          res.cookie('failure_signal', '4');
          res.cookie('failure_message', '用户被锁定');
          res.redirect(302, appconfig.login_config.failure_redirect_url);
          res.end();
          break;
        case 5:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("密码错误");
          redisClient.recordLastLoginFailed(params);
          res.cookie('failure_signal', '5');
          res.cookie('failure_message', '密码错误');
          res.redirect(302, appconfig.login_config.failure_redirect_url);
          res.end();
          break;

        case 6:

          // var code = codeHandler.handleCodeFromSelf(params);
          var uuid_accesstoken = authHandler.handleAuthFromSelf();
          var uuid_refreshtoken = authHandler.handleRefreshToken();
          // res.cookie('failure_signal', '6');
          // res.cookie('failure_message', '用户未授权');
          // res.redirect(302, appconfig.login_config.failure_redirect_url);
          // res.end();


          var _fingerprint = params.fingerprint;
          // 向客户端设置一个Cookie
          res.cookie('_accessToken', uuid_accesstoken, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          res.cookie('_fingerPrint', _fingerprint, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          res.cookie('_refreshToken', uuid_refreshtoken, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          params.accesstoken = uuid_accesstoken;
          params.refreshtoken = uuid_refreshtoken;
          params.clientid = uuid.v1();
          params.useragent = req.headers['user-agent'];
          if (req.headers['x-real-ip'] == null || req.headers['x-real-ip'] == undefined) {
            params.ipaddr = req.connection.remoteAddress;
          }
          else {
            params.ipaddr = req.headers['x-real-ip'];
          }
          if(redisClient.loginConflict(uuid_accesstoken, params,"sys_user")){
            mysqlClient.insertLoginHistory(params,"sys_user");
            mysqlClient.updateLoginCurrent(params,"sys_user");
            mysqlClient.getAuthorizedPath(params.username,params.schema,"sys",callback,"role").then((r)=>{
                redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, _fingerprint, params,r);
            });
            res.redirect(302, params.redirectURL);
            res.end();
          }
          else{
            res.redirect(302, params.failureURL);
            res.end();
          }

          break;

        case 7:
          // res.writeHead(401, {"Content-type": "text/html;charset=utf-8"});
          // res.write("微信登陆密码错误");
          var _time_long = redisClient.recordLastLoginFailed(params);
          res.cookie('failure_signal', '7');
          res.cookie('failure_message', '微信登陆密码错误');
          res.redirect(302, params.failureURL);
          res.end();
          break;

        case 8:
          res.cookie('failure_signal','8');
          res.cookie('failure_message','账号密码不匹配');
          res.redirect(302,params.redirectURL);
          res.end();
          break;

        case 0:
          // var code = codeHandler.handleCodeFromSelf(params);
          var uuid_accesstoken = authHandler.handleAuthFromSelf();
          var uuid_refreshtoken = authHandler.handleRefreshToken();
          var _fingerprint = params.fingerprint;

          // 向客户端设置一个Cookie
          res.cookie('_accessToken', uuid_accesstoken, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          res.cookie('_fingerPrint', _fingerprint, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          res.cookie('_refreshToken', uuid_refreshtoken, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          res.cookie('merch', params.merchantnum, { expires: new Date(Date.now() + 86400000), httpOnly: true });
          params.accesstoken = uuid_accesstoken;
          params.refreshtoken = uuid_refreshtoken;
          params.clientid = uuid.v1();
          params.useragent = req.headers['user-agent'];
          if (req.headers['x-real-ip'] == null || req.headers['x-real-ip'] == undefined) {
            params.ipaddr = req.connection.remoteAddress;
          }
          else {
            params.ipaddr = req.headers['x-real-ip'];
          }
          if(redisClient.loginConflict(uuid_accesstoken, params,"sys_user")){
            mysqlClient.insertLoginHistory(params,"sys_user");
            mysqlClient.updateLoginCurrent(params,"sys_user");
            mysqlClient.getAuthorizedPath(params.username,params.schema,"sys","role").then((r)=>{
              //console.log('wss_path:',r);
              redisClient.setAccesstokenAndFingerPringt(uuid_accesstoken, _fingerprint, params,JSON.stringify(r));
            });
            res.redirect(302, appconfig.login_config.success_redirect_url);
            res.end();
          }
          else{
            res.writeHead(401, {"Content-type": "text/html"});
            res.write('login conflict');
            res.end();
          }

          break;
        default:
          console.log('default');
      };
    }
  });
}
