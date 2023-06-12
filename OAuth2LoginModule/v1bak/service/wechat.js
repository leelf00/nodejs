/* =========================================================
	微信服务
	@author
	@version 20160523
	@update 20160523 by fei 首次提交
  @update 20160612 by fei 增加ngrok部分，用于测试
  @update 20160817 by fei 移除了ngrok部分，函数模块化改写
 * ========================================================= */
//'use strict'
const https = require('https');
const http = require('http');
var anyBody = require("body/any");
//var OAuth = require('wechat-oauth');
var redisClient = require('../redis.js');
var login_cHandler = require('./login_c.js');
const appid = 'wx220efe101697ed13';
const client_sercret = '131026bf483141dfd42d7891279c3c09';
//wechat access_token,expire for 7200sec
exports.wechat_access_token = '';
exports = module.exports = {};

//根据用户请求的code，获取用户的openid
module.exports.getOpenId = function getOpenId(code) {
    return new Promise((resolve, reject) => {
        //console.time('[工具模块]获取用户openid耗时');
        https.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + appid + '&secret=' + client_sercret + '&code=' + code + '&grant_type=authorization_code', (res) => {
            let _body = '';
            res.on('data', (d) => {
                _body += d;
            });
            res.on('end', (r) => {
                try {
                    _body = JSON.parse(_body);
                    //console.timeEnd('[工具模块]获取用户openid耗时');
                    resolve(_body);
                } catch (x) {
                    console.log('json parse error:', x);
                    reject(x);
                }
            });
        });
    });
};

//获取访问微信令牌
module.exports.getAccessToken = function getAccessToken() {
    return new Promise((resolve, reject) => {
        //console.time('[工具模块]获取微信accesstoken耗时');
        https.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appid + '&secret=' + client_sercret, (res) => {
            let _body = '';
            res.on('data', (d) => {
                _body += d;
            });
            res.on('end', (r) => {
                try {
                    _body = JSON.parse(_body);
                    //console.timeEnd('[工具模块]获取微信accesstoken耗时');
                    resolve(_body);
                } catch (x) {
                    console.log('json parse error:', x);
                    reject(x);
                }
            });
        }).on('error', (e) => {
            console.error('[工具模块]获取微信AccessToken失败:', e);
            reject(e);
        });
    });
}

//异步调用获取微信access_token方法
module.exports.refreshToken = function refreshToken() {
    return new Promise((resolve, reject) => {
        this.getAccessToken().then((val) => {
            wechat_access_token = val.access_token;
            //let _expire = val.expires_in;
            console.log('[工具模块]wechat access_token:', val.access_token);
            //wechat access_token 设置到redis公用缓存
            redisClient.getClient().set('C_system_wechat_access_token', 'java.lang.String:' + JSON.stringify(val.access_token));
            require('./wechat.js').refreshTicket().then((v)=>{
              resolve(true);
            });
        });
    });
}

//异步调用获取微信Ticket方法
module.exports.refreshTicket = function refreshTicket() {
    return new Promise((resolve, reject) => {
      //console.time('[工具模块]获取微信ticket耗时');
      https.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + wechat_access_token + '&type=jsapi', (res) => {
        let _body = '';
        res.on('data', (d) => {
            _body += d;
        });
        res.on('end', (r) => {
            try {
                _body = JSON.parse(_body);
                console.log('[工具模块]微信ticket:', _body.ticket);
                redisClient.getClient().set('C_system_wechat_ticket', 'java.lang.String:' + JSON.stringify(_body.ticket));
                //console.timeEnd('[工具模块]获取微信ticket耗时');
                resolve(true);
            } catch (x) {
                console.log('wechat ticket json parse error:', x);
                reject(false);
            }
        });

      });
    });
}

//首次刷新令牌
redisClient.standloneWork(function clusterRefreshAccessToken() {
    return new Promise((resolve, reject) => {
      new Promise((resolve, reject) => {resolve()}).then(()=>{
        redisClient.standloneWork(function clusterRefreshAccessToken() {
            return new Promise((resolve, reject) => {
              require('./wechat.js').refreshToken().then((val) => { resolve(true); })
            });
        });
      });
    });
});

//2小时刷新令牌
this.timmer = redisClient.redisIntervalTimer(function refreshAccessToken() {
    redisClient.standloneWork(function clusterRefreshAccessTokenTask() {
        return new Promise((resolve, reject) => {
            require('./wechat.js').refreshToken().then((val) => {
                resolve(true);
            });
        });
    })
}, 7200 * 1000 - 10000);

//处理微信自动登录
module.exports.handleWechatAutoLogin = function (server) {
    server.get('/c_wss/wechat_autologin', function(req, res) {
        anyBody(req,function(err,body){
          //如果参数里有code，则调用https到企鹅服务器查询用户openid
          if (req.query.code) {
              console.log('[微信用户登录]微信用户wechat_code:', req.query.code);
              //根据openid，在系统内自动登录
              require('./wechat.js').getOpenId(req.query.code).then((val) => {
                  if(typeof val== 'undefined') {
                    res.writeHead(401, {
                        "Content-type": "text/html"
                    });
                    res.write('No openid');
                    res.end();
                  }
                  console.log('[微信用户登录]微信用户wechat_openid:', val.openid);
                  console.log('[微信用户登录]微信用户wechat_accesstoken:', val.access_token);
                  console.log('[微信用户登录]微信用户wechat_refreshtoken:', val.refresh_token);
                  //console.log('redirectURL:',req.query.redirectURL);
                  //console.log('failureURL:',req.query.failureURL);
                  var param = {
                      wechat_openid: val.openid,
                      wechat_access_token: val.access_token,
                      wechat_refresh_token: val.refresh_token,
                      username: val.openid
                  };
                  param['wechat_login_type'] = 'auto';
                  login_cHandler.handleLogin_C(server, param, req, res, body);
              });
          } else {
              console.log('param:', req.query);
          }
        });

    });
    //微信正常登录
    server.post('/c_wss/wechat_login', (req, res) => {
        anyBody(req,function(err,body){
            var param = {};
            let _accessToken = req.cookies['_accessToken'] || '';
            redisClient.getClient().hgetall('S_session_' + _accessToken, function(err, reply) {
              if (reply['wechat_openid'] != undefined) {
                  param['wechat_openid'] = reply['wechat_openid'];
                  param['wechat_login_type'] = 'username';
                  console.log('param&map:', param);
                  login_cHandler.handleLogin_C(server, param, req, res, body);
              }
            })
        });

    });
};
