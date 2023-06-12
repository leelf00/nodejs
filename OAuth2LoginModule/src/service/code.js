const uuid = require('uuid');
const redisClient = require('../redis');
//处理外部授权码请求
exports.handleCode = (app) => {
    //根据用户名密码，发放授权码
    app.post('/b_wss/code', function (req, res) {
        var code = uuid.v1();
        redisClient.setLoginCode(req.body.username,code);
        return code;
    });
}

//处理内部授权码请求
exports.handleCodeFromSelf = (params) => {
    var code = uuid.v1();
    redisClient.setLoginCode(params.username,code);
    return code;
}