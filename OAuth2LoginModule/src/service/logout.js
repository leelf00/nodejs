/* =========================================================
	登出Service
	@author
	@version 20160422
	@update 20160422 首次提交
 * ========================================================= */
'use strict';
const Promise = require('bluebird');
const redisClient  = require('../redis');
const mysqlClient = require('../mysql');
// 系统配置文件
const appconfig = require('../config/config').appconfig;

// 处理用户登出
module.exports.handleLogout = function (router) {
    //商户端注销
    router.all('/b_wss/logout', function (ctx,next) {
      //清除redis的对应accesstoken对象&清除redis登录对象account_login_map中的对应键值
      redisClient.delAccessTokenWhenLogout(ctx.cookies.get('_accessToken'),'sys_user');
      let params = ctx.request.query;
      //客户端模式
      if (!(params === undefined) && params['login_type']=='json') {
        ctx.response.type='application/json';
        ctx.body = JSON.stringify({return_code:'success'});
      }else{
        //清除cookie对象中的列
        ctx.cookies.set('failure_signal', '').set('failure_message', '').set('_accessToken', '')
        .set('_fingerPrint', '').set('_refreshToken', '');
        //跳转到登录界面
        ctx.status = 302;
        ctx.redirect(appconfig.login_config.failure_redirect_url);
      }

    });
    //用户端注销
    router.all('/c_wss/logout', function (req,res) {
      //清除redis的对应accesstoken对象&清除redis登录对象account_login_map中的对应键值
      redisClient.delAccessTokenWhenLogout(ctx.cookies.get('_accessToken'),"client_user");
      //往数据库sys_user_login_history表中最后一条更新logouttime。

      //清除cookie对象中的列
      ctx.cookies.set('failure_signal', '').set('failure_message', '').set('_accessToken', '')
      .set('_fingerPrint', '').set('_refreshToken', '');
      //跳转到登录界面
      ctx.status = 302;
      ctx.redirect(appconfig.login_config.failure_redirect_url);
    });
    //使用微信功能模块
    if(appconfig.use_wechat_module===true){
      //微信端用户注销
      router.all('/c_wss/wechat_logout', function (req,res) {
          //redis中的处理
          return redisClient.wechatLogout(Cookies._accessToken).then(val=>{
            //修改cookie中的accesstoken
            ctx.cookies.set('_accessToken', val, {
              //expires: new Date(Date.now() + 86400000),
              httpOnly: true
            });
            //调用数据库记录用户登出方法
            redisClient.delAccessTokenWhenLogout(Cookies._accessToken,"client_user");
            //设置该微信账号的autologin为false
            mysqlClient.wechatLogouthandle(val,'station','client_user');

            //清除cookie对象中的列
            ctx.cookies.set('failure_signal', '').set('failure_message', '').set('_accessToken', '')
            .set('_fingerPrint', '').set('_refreshToken', '');
            //跳转到指定界面
            ctx.status = 302;
            ctx.redirect(ctx.request.body.redirectURL);

            //test
            console.log('wechat_logout');
          });
      });
    }


}
