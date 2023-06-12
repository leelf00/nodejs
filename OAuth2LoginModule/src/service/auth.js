/* =========================================================
	访问令牌服务
	@author
	@version 20160421
	@update 20160421 by fei 首次提交
 * ========================================================= */
'use strict';
const uuid = require('uuid');
const redisClient = require('../redis');

exports.handleAuth = (app) => {
    //根据授权码，发放AccessToken
    app.post('/b_wss/auth', function (req, res) {

    });
}

//处理内部认证授权码发放访问令牌请求
module.exports.handleAuthFromSelf = () => {
    // if(redisClient.getLoginCode(username,code)){
        return uuid.v1();
    // }
    // else return null;
}

//生成RefreshToken
module.exports.handleRefreshToken = () => {
    return uuid.v1();
}
