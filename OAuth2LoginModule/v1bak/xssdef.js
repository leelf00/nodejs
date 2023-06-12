/* =========================================================
	XSS攻击处理
	@author
	@version 20160418
	@update 20160418 by fei 首次提交
 * ========================================================= */
//"use strict";
var xss = require('xss');
var exports = module.exports = {};
/** XSS攻击防御，对res进行处理 ，req和res为express封装，body部分依赖express的body-parser解析器 **/
exports.xssdefence = (req, res, body) => {
	//GET模式
  //console.log(req.query);
  let _gp;
  for(_gp in req.query){
    if(req.query[_gp]!=xss(req.query[_gp])){
      return true;
    }
  }
	if(req.method=='POST'&&typeof body!='undefined'){
		//POST模式
    let _p;
    //console.log('req.body',body);
    //处理xss攻击，包含参数名和参数值
    for(_p in body){
			if(_p!=xss(_p)){
				return true;
			}
		}
		for(_p in body){
			if(body[_p]!=xss(body[_p])){
				return true;
			}
		}
	}
	return false;
};

/** 处理XSS攻击开始 **/
var handleXssAttack = (res) => {
	return true;
}
/** 处理XSS攻击结束 **/
