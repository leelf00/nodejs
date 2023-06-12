var http = require("http");
var appconfig = require('./config.js').appconfig;

var _ip_addr = '';

var _get_ip_options = {
  host: 'ip.taobao.com',
  port: 80,
  path: '/service/getIpInfo2.php?ip=myip',
  method: 'GET'
};

var _refresh_domain_options =  {
  host: 'ddns.oray.com',
  port: 80,
  path: '/ph/update?hostname='+appconfig.domain+'&myip='+_ip_addr,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent'  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
  },
  auth: appconfig.username+':'+appconfig.password,

};

var _get_ip_addr = function (){
  var _ger_ip_req = http.request(_get_ip_options, function(res) {
    if(res.statusCode==200){
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        _ip_addr = JSON.parse(chunk).data.ip;
        console.log(_ip_addr);
        _get_oray_domain_req();
      });
    }
  });
  _ger_ip_req.end();
  _ger_ip_req.on('error', function(e) {
    console.log('error: ' + e.message);
  });
}

var _get_oray_domain_req = function () {
  var _refresh_domain_req = http.request(_refresh_domain_options, function(res) {
    if(res.statusCode==200){
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log(chunk);
      });
    }
  });
  _refresh_domain_req.end();
  _refresh_domain_req.on('error', function(e) {
    console.log('error: ' + e.message);
  });
}

var _time_inv = setInterval(_get_ip_addr,appconfig.refresh_inv);
_get_ip_addr();
