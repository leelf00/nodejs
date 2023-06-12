/* =========================================================
	url路由
	@author
	@version 20160418
	@update 20160418 by fei 首次提交
 * ========================================================= */
"use strict";
//TODO 数据库访问应该只有初始化时的一次
exports.urlrouter = (requrl,result) => {
	//判断url的开始地址，eg：/iccard_wss/makecard/，则/iccard_wss为标识加油卡系统，通过这个标识，判断服务器路径。
	var _cache_server_urls = result;
  //修改为ES6 for of 循环避免遍历完成前无法return的情况？？
  let _r;
	for (_r in _cache_server_urls) {
		if (requrl.startsWith(_r)) {
			return _cache_server_urls[_r];
		}
	}
	return '127.0.0.1';
}

/**
	缓存用的对象实例，从redis中获取到的配置，这里作为缓存使用
 *
 */


//  var _cache_server_urls = {
// 	 //加油卡管理系统后台
// 	 iccard_wss		: 'http://172.18.5.168/iccard_wss',
// 	 //销售管理系统后台
// 	 salesys_wss	:	'http://172.18.5.168/salesys_wss',
// 	 //系统管理，用户管理，权限管理后台
// 	 system_wss		:	'http://172.18.5.168/system_wss',
// 	 //商户管理后台
// 	 station_wss	:	'http://172.18.5.168/station_wss',
//    //加油卡管理系统前台静态页面
//    iccard_web   : 'http://172.18.5.168/iccard_web',
//    //销售管理系统前台静态页面
//    salesys_web  : 'http://172.18.5.168/salesys_web',
//    //系统管理，用户管理，权限管理前台静态页面
//    system_web   : 'http://172.18.5.168/system_web',
//    //商户管理前台
//    station_web  : 'http://172.18.5.168/station_web',
//  }
