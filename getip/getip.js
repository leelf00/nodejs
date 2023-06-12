var http = require("http");
require("babel-core/register")({
    "presets": [
        "es2015",
        "stage-0"
    ]
});
require("babel-polyfill");
const Koa = require('koa');
const app = new Koa();
var Router = require('koa-router');
const router = new Router();
//var appconfig = require('./config.js').appconfig;

var _ip_addr = '';

const _get_ip_options = {
  host: 'ip.taobao.com',
  port: 80,
  path: '/service/getIpInfo2.php?ip=myip',
  method: 'GET'
};

var _get_ip_addr = function (){
  var _ger_ip_req = http.request(_get_ip_options, function(res) {
    if(res.statusCode==200){
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        _ip_addr = JSON.parse(chunk).data.ip;
        //console.log(_ip_addr);

      });
    }
  });
  _ger_ip_req.end();
  _ger_ip_req.on('error', function(e) {
    console.log('error: ' + e.message);
  });
}

//啟動時候獲取第一次
_get_ip_addr();

router.get('/', function (ctx, next) {
  _get_ip_addr();
  ctx.body = _ip_addr;
});

app.use(router.routes()).use(router.allowedMethods());
app.listen(8081, ()=>console.log(`listen on 8081`));
// server.listen(8081);