/* =========================================================
	登出Service
	@author
	@version 20160422
	@update 20160422 首次提交
 * ========================================================= */
var uuid = require('node-uuid');
var anyBody = require("body/any");
var xssdefence = require('../xssdef.js');
var redisClient  = require('../redis.js');
var mysqlClient = require('../mysql.js');
var authHandler = require('./auth.js');
// 系统配置文件
var appconfig = require('../config/config').appconfig;

// 处理用户登出
exports.handleLogout = function (app) {
    app.all('/b_wss/logout', function (req,res) {
      var requrl = req.url;
      var Cookies = req.cookies;
      //清除cookie对象中的列
      res.clearCookie('failure_signal');
      res.clearCookie('failure_message');
      res.clearCookie('_accessToken');
      res.clearCookie('_fingerPrint');
      res.clearCookie('_refreshToken');
      //清除redis的对应accesstoken对象&清除redis登录对象account_login_map中的对应键值
      redisClient.delAccessTokenWhenLogout(Cookies._accessToken,"sys_user");

      //往数据库sys_user_login_history表中最后一条更新logouttime。


      //删除sys_user_login_current表中当前登录人的记录

      //跳转到登录界面
      res.redirect(302, appconfig.login_config.failure_redirect_url);
      res.end();
      //test
      console.log('logout here');
      return true;
    });

    app.all('/c_wss/logout', function (req,res) {
      var requrl = req.url;
      var Cookies = req.cookies;
      //清除cookie对象中的列
      res.clearCookie('failure_signal');
      res.clearCookie('failure_message');
      res.clearCookie('_accessToken');
      res.clearCookie('_fingerPrint');
      res.clearCookie('_refreshToken');
      //清除redis的对应accesstoken对象&清除redis登录对象account_login_map中的对应键值
      redisClient.delAccessTokenWhenLogout(Cookies._accessToken,"client_user");

      //往数据库sys_user_login_history表中最后一条更新logouttime。


      //删除sys_user_login_current表中当前登录人的记录

      //跳转到登录界面
      res.redirect(302, appconfig.login_config.failure_redirect_url);
      res.end();
      //test
      console.log('logout here');
      return true;
    });

    app.all('/c_wss/wechat_logout', function (req,res) {
      anyBody(req,res,function(err,body){
        if(err) console.log('body err:',err);
        var requrl = req.url;
        var Cookies = req.cookies;
        //清除cookie对象中的列
        res.clearCookie('failure_signal');
        res.clearCookie('failure_message');
        res.clearCookie('_accessToken');
        res.clearCookie('_fingerPrint');
        res.clearCookie('_refreshToken');

        //redis中的处理
        redisClient.wechatLogout(Cookies._accessToken).then((val)=>{
          //修改cookie中的accesstoken
          res.cookie('_accessToken', val, {
            //expires: new Date(Date.now() + 86400000),
            httpOnly: true
          });
          //调用数据库记录用户登出方法
          redisClient.delAccessTokenWhenLogout(Cookies._accessToken,"client_user");
          //设置该微信账号的autologin为false
          mysqlClient.wechatLogouthandle(val,'station','client_user');
          //跳转到指定界面
          res.redirect(302, body.redirectURL);
          res.end();
          //test
          console.log('wechat_logout');
        });

      });

    });

}
