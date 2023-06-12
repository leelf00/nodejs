/* =========================================================
	Redis连接器
	@author
	@version 20160323
	@update 20160323 by fei 首次提交
 * ========================================================= */
// 目前bluebird性能比原生的高一些
const Promise = require('bluebird');
//const appconfig = require('./config/config').appconfig;
var client = require('redis').createClient({
    host:'172.18.4.114',
    port:6379
});

client.on('connect', function() {
  console.log('Redis已连接');
});

client.on("error", function (err) {
  console.log("Redis异常: " + err);
});

module.exports.getClient = function getClient(){
  return client;
}