/* =========================================================
	微信服务
	@author
	@version 20160523
	@update 20160523 by fei 首次提交
  @update 20160612 by fei 增加ngrok部分，用于测试
  @update 20160817 by fei 移除了ngrok部分，函数模块化改写
 * ========================================================= */
'use strict';
const Promise = require('bluebird');
const https = require('https');
const redisClient = require('../redis');
const appid = 'wx220efe101697ed13';
//const client_sercret = '131026bf483141dfd42d7891279c3c09';
//现在是这个
const client_sercret = '04160447fb02e98989c442e2cc8f7287';
//wechat access_token,expire for 7200sec
module.wechat_access_token = '';
exports = module.exports = {};

//根据用户请求的code，获取用户的openid
module.exports.getOpenId = function getOpenId(code) {
    return new Promise((resolve, reject) => {
        //console.time('[工具模块]获取用户openid耗时');
        https.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${client_sercret}&code=${code}&grant_type=authorization_code`, (res) => {
            let _body = Buffer.alloc(0);
            res.on('data', (d) => {
                _body = Buffer.concat([_body,d],(_body.length+d.length));
            });
            res.on('end', (r) => {
                try {
                    //console.timeEnd('[工具模块]获取用户openid耗时');
                    console.log(_body.toString('utf8'));
                    resolve(JSON.parse(_body.toString('utf8')))
                } catch (x) {
                    console.error('json parse error:', x);
                    reject(x);
                }
            });
        }).on('error', e => {
            console.error(`[wechat]获取微信OpenId失败:${e}`);
            reject(e);
        });
    });
};

//获取访问微信令牌
module.exports.getAccessToken = function getAccessToken() {
    return new Promise((resolve, reject) => {
        //console.time('[工具模块]获取微信accesstoken耗时');
        https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${client_sercret}`, (res) => {
            let _body = Buffer.alloc(0);
            res.on('data', d => {
              _body = Buffer.concat([_body,d],(_body.length+d.length));
            });
            res.on('end', r => {
                try {
                    //console.timeEnd('[工具模块]获取微信accesstoken耗时');
                    resolve(JSON.parse(_body.toString('utf8')))
                } catch (x) {
                    console.error('json parse error:', x);
                    reject(x);
                }
            });
        }).on('error', e => {
            console.error(`[wechat]获取微信AccessToken失败:${e}`);
            reject(e);
        });
    });
}

//异步调用获取微信access_token方法
module.exports.refreshToken = function refreshToken() {
    return new Promise((resolve, reject) => {
        this.getAccessToken().then(val => {
            module.exports.wechat_access_token = val.access_token;
            //console.log(`${JSON.stringify(val)}`);
            console.log(`[wechat]微信access_token:${val.access_token}`);
            //wechat access_token 设置到redis公用缓存
            redisClient.getClient().set('C_system_wechat_access_token', JSON.stringify(val.access_token));
            return require('./wechat').refreshTicket(val.access_token)
        }).catch(e=>{
          reject(e);
        });
    });
}

//异步调用获取微信Ticket方法
module.exports.refreshTicket = function refreshTicket(wechat_access_token) {
    return new Promise((resolve, reject) => {
      //console.time('[工具模块]获取微信ticket耗时');
      https.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${wechat_access_token}&type=jsapi`, (res) => {
        let _body = Buffer.alloc(0);
        res.on('data', (d) => {
            _body = Buffer.concat([_body,d],(_body.length+d.length));
        });
        res.on('end', (r) => {
            try {
                let _r = JSON.parse(_body.toString('utf8'))
                console.log(`[wechat]微信ticket:${_r.ticket}`);
                redisClient.getClient().set('C_system_wechat_ticket', JSON.stringify(_r.ticket));
                //console.timeEnd('[工具模块]获取微信ticket耗时');
                resolve(true);
            } catch (x) {
                console.error(`[wechat]wechat ticket json parse error:${x}`);
                reject(false);
            }
        });

      });
    });
}