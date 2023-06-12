const http = require('http');
module.exports.test = function test(code) {

        //console.time('[工具模块]获取用户openid耗时');
        http.get('http://172.18.4.114:3000/center/service/member/calcpoints?member_no=100000000002&merch_id=1001&trans_amt=110.32', (res) => {
            let _body = '';
            res.on('data', (d) => {
                _body += d;
            });
            res.on('end', (r) => {
              console.log(res.headers);
              console.log(_body);
            });
        });

};

require('./test').test();