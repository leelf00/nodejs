/* =========================================================
	登陆Service
	@author
	@version 20160418
	@update 20160418 首次提交
 * ========================================================= */
'use strict';
const Promise = require('bluebird');
const redisClient = require('../redis');
const mysqlClient = require('../mysql');

//仿真获取登录用户信息
module.exports.handleGetUser = function (router) {
  router.all('/sso_wss/system/userinfo/getUser',function (ctx,next) {
    return redisClient.getUserByAccessToken(ctx.cookies.get('_accessToken')).then(val=>{
      if((typeof val!=undefined)&&(val!=null)){
        val.accesstoken=val._accessToken;
        val.fingerprint=val._fingerPrint;
        delete val.wss_path;
        delete val.schema;
        delete val._accessToken;
        delete val._fingerPrint;
        //delete val.ip_addr;
        val.last_login_time = val.last_login_time||'2016-9-27 20:00:00';
        val.is_frequent_ip = val.is_frequent_ip||true;
        ctx.response.type='application/json';
        ctx.body=JSON.stringify({data:[val]});
      }else{
        ctx.status=401;
        ctx.response.type='application/json';
        ctx.body=JSON.stringify({error:'Not Login'});
      }

    });
  });
}

//仿真获取登录用户菜单
module.exports.handleGetMenu = function (router) {
  router.all('/sso_wss/system/menu/getMenu',function (ctx,next) {
    return redisClient.getUserByAccessToken(ctx.cookies.get('_accessToken')).then(val=>{
      if(val==null){
        ctx.response.type='application/json';
        ctx.body=JSON.stringify({error:'Not Login'});
      }else{
        return mysqlClient.getMenu({merchantnum:val.merch_id,user_id:val.login_user_id}).then(v=>{
          //组合到菜单形式
          let _v;
          for(_v in v){
            if(v[_v].menu_code.length==4){
              let _menu_code = v[_v].menu_code.substring(0,2);
              for(let _k in v){
                //console.log(v[_k]);
                if(v[_k].menu_code==_menu_code){
                  v[_k].children = v[_k].children || [];
                  v[_k].children.push(v[_v]);

                }
              }
            }

          }

          let i;
          for(i = 0;i<v.length;i++){
              if(v[i].menu_code.length==4){
                  v.splice(i,1);
                  i= i-1;
              }
          }
          //console.log(JSON.stringify(v));
          ctx.response.type='application/json';
          ctx.body=JSON.stringify({data:[v]});
        });
      }

    });
  });
}

//test
module.exports.handleTest = function (router) {
    router.all('/sso_wss/wechat/bindcard/bindcard',function (ctx,next) {
      ctx.response.type='application/json';
      ctx.body=JSON.stringify({
      	error:{
      		message:"失败信息"
      	},
      	message:"绑定成功",
      	resp_code:0,
      	return_code:"success"
      });
    }
}